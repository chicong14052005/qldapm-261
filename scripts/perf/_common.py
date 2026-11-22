"""Tiện ích dùng chung cho các script đo O1–O5. Chỉ dùng Python standard library.

Tái sử dụng Client trong scripts/smoke.py (cookie jar riêng, CSRF, Idempotency-Key).
Biến môi trường giống smoke: BASE_URL (mặc định http://127.0.0.1:3000), DEMO_PASSWORD.
"""
import json, math, os, platform, subprocess, sys, time, uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

PERF_DIR = Path(__file__).resolve().parent
SCRIPTS_DIR = PERF_DIR.parent
REPO_DIR = SCRIPTS_DIR.parent
RESULT_DIR = REPO_DIR / 'docs' / 'verification' / 'perf'
sys.path.insert(0, str(SCRIPTS_DIR))

from smoke import Client, BASE, PASSWORD, checks  # noqa: E402,F401

VN = timezone(timedelta(hours=7))


def now_vn():
    return datetime.now(VN).isoformat(timespec='seconds')


def percentile(values, p):
    """Percentile kiểu nearest-rank (p trong 0..100). Trả None nếu rỗng."""
    if not values:
        return None
    ordered = sorted(values)
    rank = max(1, math.ceil(p / 100 * len(ordered)))
    return ordered[rank - 1]


def summarize_ms(values):
    if not values:
        return {'count': 0}
    return {
        'count': len(values),
        'min_ms': round(min(values), 1),
        'p50_ms': round(percentile(values, 50), 1),
        'p90_ms': round(percentile(values, 90), 1),
        'p95_ms': round(percentile(values, 95), 1),
        'p99_ms': round(percentile(values, 99), 1),
        'max_ms': round(max(values), 1),
        'mean_ms': round(sum(values) / len(values), 1),
    }


def git_commit():
    try:
        out = subprocess.run(['git', '-C', str(REPO_DIR), 'rev-parse', '--short', 'HEAD'],
                             capture_output=True, text=True, timeout=10)
        return out.stdout.strip() or None
    except Exception:
        return None


def environment():
    return {
        'base_url': BASE,
        'run_at_vn': now_vn(),
        'git_commit': git_commit(),
        'python': platform.python_version(),
        'platform': platform.platform(),
        'host_cpu_count': os.cpu_count(),
        'note': 'Ghi thêm thủ công vào báo cáo: CPU/RAM máy host, tài nguyên Docker Desktop (Settings > Resources), mạng.',
    }


def write_result(name, payload):
    RESULT_DIR.mkdir(parents=True, exist_ok=True)
    target = RESULT_DIR / f'{name}.json'
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    return target


def available_items(client, count=1, exclude=()):
    """Lấy các món đang bán được từ /menu (sắp theo giá giảm dần)."""
    menu = client.call('GET', '/menu')
    items = [i for i in menu['items'] if i.get('isAvailable') and i['id'] not in exclude]
    items.sort(key=lambda i: -i['priceVnd'])
    if len(items) < count:
        raise SystemExit(f'Cần ít nhất {count} món đang bán, hiện chỉ có {len(items)}.')
    return items[:count]


def row(item, qty=1, note=None):
    r = {'menuItemId': item['id'], 'quantity': qty, 'observedPriceVnd': item['priceVnd']}
    if note:
        r['note'] = note
    return r


def all_items(order):
    return [i for b in order['batches'] for i in b['items']]


def cook_and_serve(kitchen, server, order_id, admin_reader):
    """Đưa mọi món PLACED/ACCEPTED/PREPARING/READY của đơn tới SERVED."""
    order = admin_reader.call('GET', f'/orders/{order_id}')
    for item in all_items(order):
        current = item
        flow = {'PLACED': ['accept', 'prepare', 'ready'], 'ACCEPTED': ['prepare', 'ready'],
                'PREPARING': ['ready'], 'READY': []}.get(item['status'])
        if flow is None:
            continue
        for action in flow:
            current = kitchen.call('POST', f"/order-items/{item['id']}/{action}", {'expectedVersion': current['version']})
        server.call('POST', f"/order-items/{item['id']}/serve", {'expectedVersion': current['version']})


def cancel_takeaway(admin, order_id, reason):
    """Hủy đơn mang về chưa chế biến để dọn hàng đợi bếp sau khi đo."""
    order = admin.call('GET', f'/orders/{order_id}')
    if order['status'] != 'SERVING':
        return order['status']
    admin.call('POST', f'/orders/{order_id}/cancel', {'expectedVersion': order['version'], 'reason': reason})
    return 'CANCELLED'


def settle(admin, cashier, order_id, method='CASH'):
    """Chốt tiền và thu tiền một đơn mà mọi món đã SERVED/CANCELLED/REJECTED."""
    order = admin.call('GET', f'/orders/{order_id}')
    checkout = admin.call('POST', f'/orders/{order_id}/request-payment', {'expectedVersion': order['version']})
    total = checkout['totalVnd']
    if total == 0:
        method = 'ZERO'
    body = {'expectedVersion': checkout['version'], 'method': method, 'amountVnd': total,
            'tenderedVnd': None, 'transferReference': None}
    if method == 'CASH':
        body['tenderedVnd'] = total + (50000 - total % 50000 if total % 50000 else 0)
    if method == 'BANK_TRANSFER':
        body['transferReference'] = 'PERF-' + uuid.uuid4().hex[:10].upper()
    payment = cashier.call('POST', f'/orders/{order_id}/payments', body)
    return checkout, payment


def login(role, client=None, retries=3):
    """Đăng nhập, tự chờ 61 s rồi thử lại nếu gặp giới hạn 10 lần đăng nhập/phút/IP (429)."""
    client = client or Client()
    for attempt in range(retries + 1):
        try:
            client.login(role)
            return client
        except AssertionError as e:
            if 'expected 200, got 429' not in str(e) or attempt == retries:
                raise
            print(f'Đăng nhập {role} bị giới hạn tần suất (429), chờ 61 giây rồi thử lại...')
            time.sleep(61)


def ms_since(t0):
    return (time.perf_counter() - t0) * 1000
