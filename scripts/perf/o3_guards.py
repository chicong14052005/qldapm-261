"""O3 — Chặn 100% đặt món đã hết; 100% hủy món sau khi nấu phải có lý do (và đúng quyền).

Mỗi ca là một lần thử vi phạm; O3 đạt khi mọi lần thử đều bị hệ thống chặn với đúng mã lỗi,
và các lần hủy hợp lệ đều lưu lý do trong audit.

Ca "món hết": tạm đánh dấu một món là hết (PATCH availability), thử đặt qua 3 đường
(tạo đơn mang về, gọi thêm, duyệt đợt đã chờ trước khi món hết), sau đó TRẢ LẠI trạng thái còn món.
Ca "hủy sau nấu": món ở PREPARING và READY; thử hủy thiếu lý do, sai quyền, rồi hủy hợp lệ;
thử hủy toàn đơn sau khi đã nấu. Đơn thử được đóng sổ bằng thanh toán ZERO.

Chạy: python scripts/perf/o3_guards.py [--rounds 3]
Kết quả: docs/verification/perf/o3-guards-result.json
"""
import argparse, json
from _common import login, available_items, row, all_items, cancel_takeaway, settle, environment, write_result

cases = []


def attempt(name, fn, expected):
    try:
        fn(expected)
        cases.append({'case': name, 'expected': expected, 'blocked': True})
    except AssertionError as e:
        cases.append({'case': name, 'expected': expected, 'blocked': False, 'detail': str(e)[:300]})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--rounds', type=int, default=3)
    args = ap.parse_args()
    admin, kitchen, cashier = login('admin'), login('kitchen'), login('cashier')
    created = []
    zero_orders = []

    for rnd in range(1, args.rounds + 1):
        target, other = available_items(admin, 2)
        # Đơn có đợt gọi thêm đang chờ duyệt TRƯỚC khi món hết.
        base = admin.call('POST', '/takeaway-orders', {'pickupName': f'O3 món hết vòng {rnd}', 'items': [row(other)]})
        created.append(base['orderId'])
        order = admin.call('GET', f"/orders/{base['orderId']}")
        pending = admin.call('POST', f"/orders/{base['orderId']}/batches", {'expectedOrderVersion': order['version'], 'items': [row(target)]})
        manage = next(i for i in admin.call('GET', '/manage/menu-items')['items'] if i['id'] == target['id'])
        off = admin.call('PATCH', f"/menu-items/{target['id']}/availability", {'expectedVersion': manage['version'], 'isAvailable': False})
        try:
            attempt(f'v{rnd}: tạo đơn mang về có món hết → 409',
                    lambda e: admin.call('POST', '/takeaway-orders', {'pickupName': 'O3 thử món hết', 'items': [row(target)]}, expected=e), 409)
            order = admin.call('GET', f"/orders/{base['orderId']}")
            attempt(f'v{rnd}: gọi thêm món hết → 409',
                    lambda e: admin.call('POST', f"/orders/{base['orderId']}/batches", {'expectedOrderVersion': order['version'], 'items': [row(target)]}, expected=e), 409)
            attempt(f'v{rnd}: duyệt đợt chờ chứa món vừa hết → 409',
                    lambda e: kitchen.call('POST', f"/batches/{pending['batchId']}/approve", {'expectedVersion': pending['version']}, expected=e), 409)
            attempt(f'v{rnd}: giá đã đổi (observedPrice sai) → 409',
                    lambda e: admin.call('POST', '/takeaway-orders', {'pickupName': 'O3 giá sai', 'items': [{**row(other), 'observedPriceVnd': other['priceVnd'] + 1000}]}, expected=e), 409)
        finally:
            admin.call('PATCH', f"/menu-items/{target['id']}/availability", {'expectedVersion': off['version'], 'isAvailable': True})
        kitchen.call('POST', f"/batches/{pending['batchId']}/reject", {'expectedVersion': pending['version'], 'reason': 'Món đã hết trong lúc chờ duyệt (đo O3).'})

        # Hủy sau khi nấu.
        a, b = available_items(admin, 2)
        t = admin.call('POST', '/takeaway-orders', {'pickupName': f'O3 hủy sau nấu vòng {rnd}', 'items': [row(a), row(b)]})
        oid = t['orderId']; zero_orders.append(oid)
        items = all_items(admin.call('GET', f'/orders/{oid}'))
        states = {}
        for idx, it in enumerate(items):
            cur = kitchen.call('POST', f"/order-items/{it['id']}/accept", {'expectedVersion': it['version']})
            cur = kitchen.call('POST', f"/order-items/{it['id']}/prepare", {'expectedVersion': cur['version']})
            if idx == 1:
                cur = kitchen.call('POST', f"/order-items/{it['id']}/ready", {'expectedVersion': cur['version']})
            states[it['id']] = cur
        for it_id, cur in states.items():
            label = cur['status']
            attempt(f'v{rnd}: hủy món {label} thiếu lý do → 422',
                    lambda e: admin.call('POST', f'/order-items/{it_id}/cancel', {'expectedVersion': cur['version']}, expected=e), 422)
            attempt(f'v{rnd}: hủy món {label} lý do rỗng → 422',
                    lambda e: admin.call('POST', f'/order-items/{it_id}/cancel', {'expectedVersion': cur['version'], 'reason': '   '}, expected=e), 422)
            attempt(f'v{rnd}: bếp tự hủy món {label} → 403',
                    lambda e: kitchen.call('POST', f'/order-items/{it_id}/cancel', {'expectedVersion': cur['version'], 'reason': 'Bếp tự hủy'}, expected=e), 403)
        o = admin.call('GET', f'/orders/{oid}')
        attempt(f'v{rnd}: hủy toàn đơn sau khi đã nấu → 409',
                lambda e: admin.call('POST', f'/orders/{oid}/cancel', {'expectedVersion': o['version'], 'reason': 'Thử hủy toàn đơn'}, expected=e), 409)
        reasons = []
        for it_id, cur in states.items():
            reason = f'O3 vòng {rnd}: món {cur["status"]} không đạt chất lượng, quản lý hủy.'
            admin.call('POST', f'/order-items/{it_id}/cancel', {'expectedVersion': cur['version'], 'reason': reason})
            reasons.append((it_id, reason))
        changes = kitchen.call('GET', '/kitchen/changes')['items']
        for it_id, reason in reasons:
            logged = any(c['targetId'] == it_id and c['action'] == 'ITEM_CANCEL' and c.get('reason') == reason for c in changes)
            cases.append({'case': f'v{rnd}: hủy hợp lệ có ghi lý do trong audit', 'expected': 'reason logged', 'blocked': logged})

    cleanup = {}
    for oid in zero_orders:
        try:
            checkout, payment = settle(admin, cashier, oid, 'ZERO')
            cleanup[oid] = f"PAID {payment['method']} {checkout['totalVnd']}"
        except AssertionError as e:
            cleanup[oid] = 'cleanup failed: ' + str(e)[:150]
    for oid in created:
        try:
            cleanup[oid] = cancel_takeaway(admin, oid, 'Dọn dữ liệu sau đo O3.')
        except AssertionError as e:
            cleanup[oid] = 'cleanup failed: ' + str(e)[:150]

    sold_out = [c for c in cases if 'hết' in c['case'] or 'giá' in c['case']]
    cancel = [c for c in cases if c not in sold_out]
    def pct(lst):
        return round(sum(1 for c in lst if c['blocked']) / len(lst) * 100, 1) if lst else None
    result = {
        'objective': 'O3', 'target': 'Chặn 100% đặt món hết; 100% hủy sau nấu có lý do',
        'environment': environment(),
        'sold_out_block_rate_percent': pct(sold_out), 'sold_out_attempts': len(sold_out),
        'cancel_guard_rate_percent': pct(cancel), 'cancel_attempts': len(cancel),
        'cases': cases, 'cleanup': cleanup,
        'result': 'PASS' if all(c['blocked'] for c in cases) else 'FAIL',
        'note': 'TC-02 trên UI vẫn kiểm thủ công. Đối chiếu toàn DB bằng scripts/perf/o2_o3_db_checks.sql.',
    }
    path = write_result('o3-guards-result', result)
    print(json.dumps({k: result[k] for k in ('result', 'sold_out_block_rate_percent', 'cancel_guard_rate_percent')}, ensure_ascii=False))
    print('Đã ghi', path)


if __name__ == '__main__':
    main()
