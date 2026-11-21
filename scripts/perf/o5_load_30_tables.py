"""O5 (phần tải) — Hệ thống chịu tải 30 bàn hoạt động đồng thời. Chỉ dùng Python standard library.

Mô phỏng theo ADR-0006 §5: 30 khách (mỗi bàn 1 thiết bị, do khóa 1 phiên QR/lượt), 10 phục vụ,
7 bếp, 2 thu ngân, 1 quản lý; polling nhân viên 1 giây, khách 2 giây; tải hỗn hợp đọc/ghi:
gửi đợt đầu, gọi thêm (chờ duyệt), duyệt, bếp chuyển trạng thái, phục vụ.
Giai đoạn: khởi động (--warmup, mặc định 120 s) rồi tải ổn định (--duration, mặc định 600 s);
chỉ số chỉ lấy trong giai đoạn ổn định. Cuối cùng DỌN DẸP: phục vụ hết món, chốt tiền và thu
tiền mặt mọi đơn thử để trả bàn về trạng thái trống (không tính vào chỉ số).

Ngưỡng so sánh (ADR-0006 §5): API p95 ≤ 2000 ms; hàng đợi nhân viên p95 ≤ 500 ms;
0 lỗi 5xx; từ lúc đợt được duyệt tới khi xuất hiện trong /kitchen/items p95 ≤ 3000 ms.
409 là xung đột nghiệp vụ có chủ đích (hai nhân viên cùng thao tác), được đếm riêng, không tính là lỗi.

Giới hạn server cần biết: đăng nhập 10 lần/phút/IP, join QR 60 lần/phút/IP. Script đăng nhập
mỗi vai 1 lần rồi các luồng cùng vai dùng chung phiên (tương đương nhiều thiết bị cùng tài khoản).

Chạy: python scripts/perf/o5_load_30_tables.py [--tables 30] [--warmup 120] [--duration 600]
Thử nhanh: python scripts/perf/o5_load_30_tables.py --tables 5 --warmup 10 --duration 30
Kết quả: docs/verification/perf/o5-load-result.json
"""
import argparse, http.cookiejar, json, random, threading, time, urllib.error, urllib.request, uuid
from collections import defaultdict
from _common import BASE, PASSWORD, environment, write_result, summarize_ms, percentile

lock = threading.Lock()
stats = defaultdict(list)          # nhóm endpoint -> [ms] (chỉ giai đoạn ổn định)
status_counts = defaultdict(int)   # 'GET /kitchen/items 200' -> số lần (mọi giai đoạn)
steady_status = defaultdict(int)   # mã trạng thái trong giai đoạn ổn định
errors = []
phase = {'name': 'setup'}
approved_at = {}                   # batchId -> perf_counter lúc có phản hồi APPROVED
seen_in_kds = {}                   # batchId -> độ trễ ms tới lần đầu thấy trong /kitchen/items
stop = threading.Event()


class Http:
    def __init__(self, guest=False, opener=None):
        self.guest = guest
        self.opener = opener or urllib.request.build_opener(urllib.request.ProxyHandler({}),
                                                             urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def call(self, method, path, body=None, group=None, key=None):
        headers = {'Content-Type': 'application/json'}
        if self.guest:
            headers['X-Actor'] = 'guest'
        if method != 'GET':
            status, data, _ = self._send('GET', '/auth/csrf', None, dict(headers), 'csrf')
            if status != 200:
                return status, data
            headers['X-CSRF-TOKEN'] = data['token']
            headers['Idempotency-Key'] = key or str(uuid.uuid4())
        status, data, _ = self._send(method, path, body, headers, group or f'{method} {path}')
        return status, data

    def _send(self, method, path, body, headers, group):
        req = urllib.request.Request(BASE + '/api/v1' + path, data=None if method == 'GET' else json.dumps(body or {}).encode(),
                                     headers=headers, method=method)
        t0 = time.perf_counter()
        try:
            with self.opener.open(req, timeout=30) as r:
                status, raw = r.status, r.read()
        except urllib.error.HTTPError as e:
            status, raw = e.code, e.read()
        except Exception as e:  # timeout, reset...
            status, raw = 0, json.dumps({'error': str(e)[:200]}).encode()
        ms = (time.perf_counter() - t0) * 1000
        try:
            data = json.loads(raw or b'{}')
        except ValueError:
            data = {'raw': raw[:200].decode(errors='replace')}
        with lock:
            status_counts[f'{group} {status}'] += 1
            if phase['name'] == 'steady':
                stats[group].append(ms)
                steady_status[status] += 1
            if status >= 500 or status == 0:
                errors.append({'phase': phase['name'], 'group': group, 'status': status, 'detail': str(data)[:200]})
        return status, data, ms


def must(status_data, what):
    status, data = status_data
    if status != 200:
        raise SystemExit(f'{what} thất bại: {status} {data}')
    return data


def login(role):
    c = Http()
    for attempt in range(4):
        status, data = c.call('POST', '/auth/login', {'username': role, 'password': PASSWORD}, 'login')
        if status == 200:
            return c
        if status != 429 or attempt == 3:
            raise SystemExit(f'Đăng nhập {role} thất bại: {status} {data}')
        print(f'Đăng nhập {role} bị giới hạn tần suất (429), chờ 61 giây rồi thử lại...')
        time.sleep(61)


def share(c, guest=False):
    return Http(guest=guest, opener=c.opener)


def guest_loop(g, oid, menu, max_extra):
    """Khách: gửi đợt đầu, polling đơn 2 s, thỉnh thoảng gọi thêm."""
    def submit(n_rows):
        st, order = g.call('GET', f'/orders/{oid}', group='GET /orders/{id} (khách)')
        if st != 200:
            return
        rows = [{'menuItemId': m['id'], 'quantity': random.randint(1, 3), 'observedPriceVnd': m['priceVnd']}
                for m in random.sample(menu, n_rows)]
        st, res = g.call('POST', f'/orders/{oid}/batches', {'expectedOrderVersion': order['version'], 'items': rows},
                         group='POST /orders/{id}/batches')
        if st == 200 and res.get('status') == 'APPROVED':
            with lock:
                approved_at[res['batchId']] = time.perf_counter()
    time.sleep(random.uniform(0, 5))
    submit(random.randint(1, 3))
    extra = 0
    next_extra = time.time() + random.uniform(45, 120)
    while not stop.is_set():
        g.call('GET', f'/orders/{oid}', group='GET /orders/{id} (khách)')
        g.call('GET', '/menu', group='GET /menu') if random.random() < 0.1 else None
        if extra < max_extra and time.time() >= next_extra:
            submit(random.randint(1, 2)); extra += 1
            next_extra = time.time() + random.uniform(60, 150)
        stop.wait(2)


def kitchen_loop(k, worker):
    """Bếp: polling hàng đợi + đợt chờ duyệt mỗi 1 s; duyệt đợt và đẩy trạng thái món."""
    flow = {'PLACED': 'accept', 'ACCEPTED': 'prepare', 'PREPARING': 'ready'}
    while not stop.is_set():
        st, q = k.call('GET', '/kitchen/items', group='GET /kitchen/items')
        now = time.perf_counter()
        if st == 200:
            with lock:
                for it in q['items']:
                    b = it['batchId']
                    if b in approved_at and b not in seen_in_kds:
                        seen_in_kds[b] = (now - approved_at[b]) * 1000
            todo = [i for i in q['items'] if i['status'] in flow]
            random.shuffle(todo)
            for it in todo[:2]:
                k.call('POST', f"/order-items/{it['id']}/{flow[it['status']]}", {'expectedVersion': it['version']},
                       group='POST /order-items/{id}/(accept|prepare|ready)')
        st, pend = k.call('GET', '/approval-batches', group='GET /approval-batches')
        if st == 200 and pend['items'] and worker < 3:
            b = random.choice(pend['items'])
            st, res = k.call('POST', f"/batches/{b['id']}/approve", {'expectedVersion': b['version']}, group='POST /batches/{id}/approve')
            if st == 200:
                with lock:
                    approved_at[b['id']] = time.perf_counter()
        stop.wait(1)


def waiter_loop(w):
    while not stop.is_set():
        st, q = w.call('GET', '/serving/items', group='GET /serving/items')
        if st == 200 and q['items']:
            it = random.choice(q['items'])
            w.call('POST', f"/order-items/{it['id']}/serve", {'expectedVersion': it['version']}, group='POST /order-items/{id}/serve')
        if random.random() < 0.2:
            w.call('GET', '/tables', group='GET /tables')
        stop.wait(1)


def poll_loop(c, path, group):
    while not stop.is_set():
        c.call('GET', path, group=group)
        stop.wait(1)


def cleanup(orders, admin, waiter, kitchen, cashier, guests):
    """Đưa mọi đơn thử về PAID để trả bàn. Không tính vào chỉ số."""
    report = {}
    for oid, g in zip(orders, guests):
        try:
            for _ in range(20):
                order = must(admin.call('GET', f'/orders/{oid}', group='cleanup'), 'Đọc đơn')
                if order['status'] != 'SERVING':
                    break
                pending = [b for b in order['batches'] if b['status'] == 'PENDING']
                for b in pending:
                    g.call('POST', f"/batches/{b['id']}/withdraw", {'expectedVersion': b['version']}, group='cleanup')
                items = [i for b in order['batches'] for i in b['items']]
                nxt = {'PLACED': 'accept', 'ACCEPTED': 'prepare', 'PREPARING': 'ready'}
                active = [i for i in items if i['status'] in ('PLACED', 'ACCEPTED', 'PREPARING', 'READY')]
                if not active and not pending:
                    st, chk = cashier.call('POST', f'/orders/{oid}/request-payment', {'expectedVersion': order['version']}, group='cleanup')
                    if st != 200:
                        continue
                    total = chk['totalVnd']
                    body = {'expectedVersion': chk['version'], 'method': 'CASH' if total else 'ZERO', 'amountVnd': total,
                            'tenderedVnd': total if total else None, 'transferReference': None}
                    cashier.call('POST', f'/orders/{oid}/payments', body, group='cleanup')
                    continue
                for i in active:
                    if i['status'] == 'READY':
                        waiter.call('POST', f"/order-items/{i['id']}/serve", {'expectedVersion': i['version']}, group='cleanup')
                    else:
                        kitchen.call('POST', f"/order-items/{i['id']}/{nxt[i['status']]}", {'expectedVersion': i['version']}, group='cleanup')
            report[oid] = must(admin.call('GET', f'/orders/{oid}', group='cleanup'), 'Đọc đơn')['status']
        except SystemExit as e:
            report[oid] = 'cleanup failed: ' + str(e)[:150]
    return report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tables', type=int, default=30)
    ap.add_argument('--warmup', type=int, default=120)
    ap.add_argument('--duration', type=int, default=600)
    ap.add_argument('--waiters', type=int, default=10)
    ap.add_argument('--kitchens', type=int, default=7)
    ap.add_argument('--cashiers', type=int, default=2)
    ap.add_argument('--managers', type=int, default=1)
    ap.add_argument('--max-extra', type=int, default=3, help='Số đợt gọi thêm tối đa mỗi bàn')
    ap.add_argument('--no-cleanup', action='store_true')
    args = ap.parse_args()

    roles = {r: login(r) for r in ('admin', 'waiter', 'kitchen', 'cashier', 'manager')}
    menu = [m for m in must(roles['admin'].call('GET', '/menu', group='setup'), 'Đọc menu')['items'] if m['isAvailable']]
    tables = [t for t in must(roles['waiter'].call('GET', '/tables', group='setup'), 'Đọc bàn')['items'] if t['isActive'] and not t['visit']]
    if len(tables) < args.tables:
        raise SystemExit(f'Chỉ có {len(tables)} bàn trống đang hoạt động, cần {args.tables}. Đóng các lượt đang mở hoặc giảm --tables.')
    tables = tables[:args.tables]

    orders, guests = [], []
    for i, t in enumerate(tables):
        qr = must(roles['waiter'].call('GET', f"/tables/{t['id']}/qr", group='setup'), 'Đọc QR')
        visit = must(roles['waiter'].call('POST', f"/tables/{t['id']}/visits", {'partySize': 1}, 'setup'), f"Mở lượt {t['code']}")
        g = Http(guest=True)
        must(g.call('POST', '/guest/join', {'qrToken': qr['qrToken']}, 'setup'), f"Khách vào bàn {t['code']}")
        orders.append(visit['orderId']); guests.append(g)
        if (i + 1) % 50 == 0:
            time.sleep(60)  # tôn trọng giới hạn join 60/phút/IP nếu chạy > 50 bàn

    threads = []
    def spawn(fn, *a):
        th = threading.Thread(target=fn, args=a, daemon=True); th.start(); threads.append(th)
    for oid, g in zip(orders, guests):
        spawn(guest_loop, g, oid, menu, args.max_extra)
    for n in range(args.kitchens):
        spawn(kitchen_loop, share(roles['kitchen']), n)
    for _ in range(args.waiters):
        spawn(waiter_loop, share(roles['waiter']))
    for _ in range(args.cashiers):
        spawn(poll_loop, share(roles['cashier']), '/checkout/orders', 'GET /checkout/orders')
    for _ in range(args.managers):
        spawn(poll_loop, share(roles['manager']), '/orders', 'GET /orders')

    phase['name'] = 'warmup'
    print(f'Khởi động {args.warmup} s với {len(threads)} luồng ({args.tables} khách)...')
    time.sleep(args.warmup)
    phase['name'] = 'steady'
    steady_start = time.time()
    print(f'Tải ổn định {args.duration} s...')
    time.sleep(args.duration)
    phase['name'] = 'stopping'
    stop.set()
    for th in threads:
        th.join(timeout=35)
    steady_s = time.time() - steady_start

    phase['name'] = 'cleanup'
    clean = {} if args.no_cleanup else cleanup(orders, roles['admin'], roles['waiter'], roles['kitchen'], roles['cashier'], guests)

    groups = {g: summarize_ms(v) for g, v in sorted(stats.items())}
    all_ms = [ms for g, v in stats.items() if g != 'csrf' for ms in v]
    queue_groups = ('GET /kitchen/items', 'GET /serving/items', 'GET /approval-batches', 'GET /checkout/orders')
    queue_ms = [ms for g in queue_groups for ms in stats.get(g, [])]
    kds_ms = list(seen_in_kds.values())
    total_steady = sum(steady_status.values())
    s5xx = sum(c for s, c in steady_status.items() if s >= 500 or s == 0)
    s409 = steady_status.get(409, 0)
    api_p95 = percentile(all_ms, 95)
    queue_p95 = percentile(queue_ms, 95)
    kds_p95 = percentile(kds_ms, 95)
    verdict = {
        'api_p95_le_2000ms': api_p95 is not None and api_p95 <= 2000,
        'staff_queue_p95_le_500ms': queue_p95 is not None and queue_p95 <= 500,
        'no_5xx_or_timeout': s5xx == 0,
        'approved_to_kds_p95_le_3000ms': kds_p95 is not None and kds_p95 <= 3000,
    }
    result = {
        'objective': 'O5 (tải)', 'target': 'Chịu tải 30 bàn đồng thời theo ngưỡng ADR-0006 §5',
        'environment': environment(),
        'config': vars(args) | {'threads': len(threads), 'staff_poll_s': 1, 'guest_poll_s': 2},
        'steady_seconds': round(steady_s, 1),
        'steady_requests': total_steady, 'throughput_rps': round(total_steady / steady_s, 1) if steady_s else None,
        'steady_status_counts': {str(k): v for k, v in sorted(steady_status.items())},
        'conflicts_409': s409, 'server_errors_5xx_or_timeout': s5xx,
        'api_overall': summarize_ms(all_ms), 'staff_queue_reads': summarize_ms(queue_ms),
        'approved_to_kitchen_queue': summarize_ms(kds_ms) | {'note': 'Đo ở mức API (lần đầu batch xuất hiện trong /kitchen/items), không gồm thời gian render UI; O1 đo UI riêng.'},
        'by_endpoint': groups, 'errors_sample': errors[:50],
        'verdict': verdict, 'result': 'PASS' if all(verdict.values()) else 'FAIL',
        'cleanup': clean,
    }
    path = write_result('o5-load-result', result)
    print(json.dumps({k: result[k] for k in ('result', 'verdict', 'throughput_rps', 'conflicts_409', 'server_errors_5xx_or_timeout')}, ensure_ascii=False, indent=2))
    print('Đã ghi', path)


if __name__ == '__main__':
    main()
