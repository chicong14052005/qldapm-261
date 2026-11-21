"""O2 — 0% sai/sót món; 0 đơn trùng khi mất mạng/gửi lại.

Đo trên API thật (không mock). Tạo dữ liệu thử là các đơn mang về; cuối script hủy các đơn
chưa chế biến để không để rác trong hàng đợi bếp.

Kịch bản:
  A. Gửi lại cùng Idempotency-Key (mô phỏng mất phản hồi rồi retry) N lần, tuần tự.
  B. Gửi đồng thời cùng một key từ nhiều luồng (mô phỏng bấm nhiều lần/mạng chập chờn).
  C. Dùng lại key với nội dung khác phải bị từ chối 409, không tạo đợt mới.
  D. Đối chiếu từng dòng đã gửi với dòng hệ thống lưu (món, số lượng, ghi chú, giá snapshot)
     để tính tỷ lệ sai/sót.

Chạy: python scripts/perf/o2_no_duplicate.py [--replays 10] [--parallel 8] [--orders 5]
Kết quả: docs/verification/perf/o2-no-duplicate-result.json
"""
import argparse, json, uuid
from concurrent.futures import ThreadPoolExecutor
from _common import Client, login, available_items, row, all_items, cancel_takeaway, environment, write_result


def compare_lines(sent_rows, stored_items):
    """Trả về (số dòng gửi, số dòng khớp, danh sách lệch)."""
    remaining = list(stored_items)
    mismatches = []
    matched = 0
    for r in sent_rows:
        hit = next((i for i in remaining if i['menuItemId'] == r['menuItemId'] and i['quantity'] == r['quantity']
                    and (i.get('note') or None) == (r.get('note') or None) and i['unitPriceVnd'] == r['observedPriceVnd']), None)
        if hit:
            matched += 1
            remaining.remove(hit)
        else:
            mismatches.append({'sent': r})
    for extra in remaining:
        mismatches.append({'unexpected_stored': {k: extra.get(k) for k in ('id', 'menuItemId', 'quantity', 'note', 'unitPriceVnd')}})
    return len(sent_rows), matched, mismatches


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--replays', type=int, default=10)
    ap.add_argument('--parallel', type=int, default=8)
    ap.add_argument('--orders', type=int, default=5)
    args = ap.parse_args()

    admin = login('admin')
    menu = available_items(admin, 3)
    created = []
    scen = {}

    # A. Retry tuần tự cùng key khi tạo đơn và khi gọi thêm.
    rows = [row(menu[0], 2, 'O2 retry tạo đơn'), row(menu[1], 1)]
    key = str(uuid.uuid4())
    body = {'pickupName': 'O2 retry', 'items': rows}
    responses = [admin.call('POST', '/takeaway-orders', body, key) for _ in range(args.replays)]
    order_ids = {r['orderId'] for r in responses}
    created.extend(order_ids)
    oid = responses[0]['orderId']
    order = admin.call('GET', f'/orders/{oid}')
    extra_key = str(uuid.uuid4())
    extra_body = {'expectedOrderVersion': order['version'], 'items': [row(menu[2], 3, 'O2 retry gọi thêm')]}
    extra_responses = [admin.call('POST', f'/orders/{oid}/batches', extra_body, extra_key) for _ in range(args.replays)]
    order = admin.call('GET', f'/orders/{oid}')
    scen['A_sequential_retry'] = {
        'requests_create': args.replays, 'distinct_orders_created': len(order_ids),
        'requests_extra_batch': args.replays, 'distinct_batches_from_retry': len({r['batchId'] for r in extra_responses}),
        'batches_in_order': len(order['batches']), 'expected_batches_in_order': 2,
        'pass': len(order_ids) == 1 and len({r['batchId'] for r in extra_responses}) == 1 and len(order['batches']) == 2,
    }
    lines_sent = rows + extra_body['items']
    a_total, a_match, a_mis = compare_lines(lines_sent, all_items(order))

    # B. Gửi đồng thời cùng key từ nhiều luồng (mỗi luồng client riêng nhưng cùng tài khoản admin).
    par_rows = [row(menu[1], 1, 'O2 đồng thời')]
    par_key = str(uuid.uuid4())
    par_body = {'pickupName': 'O2 đồng thời', 'items': par_rows}
    workers = []
    for _ in range(args.parallel):
        c = Client(); c.opener = admin.opener  # dùng chung cookie đăng nhập, tránh giới hạn 10 lần login/phút
        workers.append(c)

    def fire(c):
        try:
            return ('ok', c.call('POST', '/takeaway-orders', par_body, par_key))
        except AssertionError as e:
            return ('error', str(e)[:300])
    with ThreadPoolExecutor(max_workers=args.parallel) as pool:
        results = list(pool.map(fire, workers))
    ok_ids = {r[1]['orderId'] for r in results if r[0] == 'ok'}
    created.extend(ok_ids)
    scen['B_parallel_same_key'] = {
        'parallel_requests': args.parallel, 'ok_responses': sum(1 for r in results if r[0] == 'ok'),
        'errors': [r[1] for r in results if r[0] == 'error'], 'distinct_orders_created': len(ok_ids),
        'pass': len(ok_ids) == 1,
    }
    b_total = b_match = 0; b_mis = []
    for poid in ok_ids:
        t, m, mis = compare_lines(par_rows, all_items(admin.call('GET', f'/orders/{poid}')))
        b_total += t; b_match += m; b_mis += mis

    # C. Dùng lại key với nội dung khác.
    reuse_status = None
    try:
        admin.call('POST', '/takeaway-orders', {**body, 'pickupName': 'O2 key bị dùng lại'}, key, expected=409)
        reuse_status = 409
    except AssertionError as e:
        reuse_status = str(e)[:200]
    order_after = admin.call('GET', f'/orders/{oid}')
    scen['C_key_reuse_different_body'] = {'status': reuse_status, 'batches_unchanged': len(order_after['batches']) == 2,
                                          'pass': reuse_status == 409 and len(order_after['batches']) == 2}

    # D. Nhiều đơn ngẫu nhiên: so khớp từng dòng gửi với dòng được lưu.
    d_total = d_match = 0; d_mis = []
    for n in range(args.orders):
        rws = [row(menu[k % 3], (n + k) % 5 + 1, f'O2 đơn {n + 1} dòng {k + 1}' if k % 2 == 0 else None) for k in range(3)]
        r = admin.call('POST', '/takeaway-orders', {'pickupName': f'O2 đối chiếu {n + 1}', 'items': rws})
        created.append(r['orderId'])
        t, m, mis = compare_lines(rws, all_items(admin.call('GET', f"/orders/{r['orderId']}")))
        d_total += t; d_match += m; d_mis += mis

    total = a_total + b_total + d_total
    matched = a_match + b_match + d_match
    error_rate = 0 if total == 0 else round((total - matched) / total * 100, 2)
    duplicate_ok = all(s['pass'] for s in scen.values())

    cleanup = {}
    for c_oid in set(created):
        try:
            cleanup[c_oid] = cancel_takeaway(admin, c_oid, 'Dọn dữ liệu sau đo O2.')
        except AssertionError as e:
            cleanup[c_oid] = 'cleanup failed: ' + str(e)[:150]

    result = {
        'objective': 'O2', 'target': '0% sai/sót món; 0 đơn trùng khi gửi lại/mất mạng',
        'environment': environment(), 'scenarios': scen,
        'line_check': {'lines_sent': total, 'lines_matched': matched, 'error_rate_percent': error_rate,
                       'mismatches': a_mis + b_mis + d_mis},
        'duplicates_found': 0 if duplicate_ok else 'XEM scenarios',
        'result': 'PASS' if duplicate_ok and error_rate == 0 else 'FAIL',
        'cleanup': cleanup,
        'note': 'Đối chiếu thêm trong DB bằng scripts/perf/o2_o3_db_checks.sql. TC-05 (bấm Gửi 2 lần trên UI) vẫn kiểm thủ công.',
    }
    path = write_result('o2-no-duplicate-result', result)
    print(json.dumps({k: result[k] for k in ('result', 'scenarios', 'line_check')}, ensure_ascii=False, indent=2)[:3000])
    print('Đã ghi', path)


if __name__ == '__main__':
    main()
