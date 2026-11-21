"""O4 — 100% hóa đơn khớp tiền (phần tự động) và chuẩn bị đơn cho phần bấm giờ thu tiền ≤ 1 phút.

Phần 1 (mặc định): tạo ~10 hóa đơn mẫu theo ADR-0006 §4 (nhóm "Tiền"), tự tính tổng kỳ vọng
ĐỘC LẬP với backend từ các dòng đã gửi (chỉ cộng món cuối cùng ở trạng thái SERVED, theo giá lúc đặt),
rồi so với: tổng chốt khi yêu cầu thanh toán, số tiền trên biên nhận, tiền thối, và lịch sử thanh toán admin.
Có thêm 2 ca âm: thu sai số tiền (409) và tiền mặt khách đưa thiếu (422).

Phần 2 (--prepare-timing N): tạo N đơn mang về đã phục vụ xong và để ở trạng thái CHỜ THANH TOÁN,
để thu ngân thật thao tác trên UI và bấm giờ vào docs/verification/perf/o4-thu-tien-bam-gio.csv.

Chạy:
  python scripts/perf/o4_billing_check.py
  python scripts/perf/o4_billing_check.py --prepare-timing 5
Kết quả: docs/verification/perf/o4-billing-result.json
"""
import argparse, json, time, uuid
from _common import (login, available_items, row, all_items, cook_and_serve, environment, write_result,
                     summarize_ms, ms_since)

# Mỗi dòng: (chỉ số món trong danh sách món đắt→rẻ, số lượng). Ghi chú duy nhất "L<n>" dùng để nhận diện dòng.
SCENARIOS = [
    {'name': '01 một món SL1, tiền mặt', 'b1': [(0, 1)], 'method': 'CASH'},
    {'name': '02 nhiều món, SL khác nhau, chuyển khoản', 'b1': [(0, 2), (1, 3), (2, 1)], 'method': 'BANK_TRANSFER'},
    {'name': '03 SL tối đa 99 món đắt nhất (tràn số)', 'b1': [(0, 99)], 'method': 'CASH'},
    {'name': '04 hủy 1 món trước khi nấu', 'b1': [(0, 1), (1, 2)], 'cancel_placed': [1], 'method': 'CASH'},
    {'name': '05 hủy 1 món sau khi nấu (quản lý, có lý do)', 'b1': [(0, 1), (2, 2)], 'cancel_cooked': [0], 'method': 'BANK_TRANSFER'},
    {'name': '06 đợt gọi thêm bị từ chối', 'b1': [(1, 1)], 'extras': [([(0, 2)], 'reject')], 'method': 'CASH'},
    {'name': '07 đợt gọi thêm bị rút', 'b1': [(1, 1)], 'extras': [([(2, 4)], 'withdraw')], 'method': 'CASH'},
    {'name': '08 đợt gọi thêm được duyệt', 'b1': [(2, 1)], 'extras': [([(0, 1), (1, 1)], 'approve')], 'method': 'BANK_TRANSFER'},
    {'name': '09 đổi giá menu sau khi đặt (giữ giá lúc đặt)', 'b1': [(1, 2)], 'price_change': 1, 'method': 'CASH'},
    {'name': '10 hủy hết sau nấu → tổng 0, ZERO', 'b1': [(0, 1)], 'cancel_cooked': [0], 'method': 'ZERO'},
]


def run_scenario(sc, menu, admin, kitchen, cashier, timings):
    lines = []  # (note, item, qty, final_status)
    def mk(spec):
        out = []
        for idx, qty in spec:
            note = f'L{len(lines) + 1}-{uuid.uuid4().hex[:4]}'
            lines.append({'note': note, 'item': menu[idx], 'qty': qty, 'final': 'SERVED'})
            out.append(row(menu[idx], qty, note))
        return out
    b1 = mk(sc['b1'])
    created = admin.call('POST', '/takeaway-orders', {'pickupName': 'O4 ' + sc['name'][:40], 'items': b1})
    oid = created['orderId']
    restore = None
    try:
        if 'price_change' in sc:
            m = menu[sc['price_change']]
            manage = next(i for i in admin.call('GET', '/manage/menu-items')['items'] if i['id'] == m['id'])
            changed = admin.call('PATCH', f"/menu-items/{m['id']}", {'expectedVersion': manage['version'], 'priceVnd': m['priceVnd'] + 5000})
            restore = (m['id'], changed['version'], m['priceVnd'])
        for spec, decision in sc.get('extras', []):
            order = admin.call('GET', f'/orders/{oid}')
            rows = mk(spec)
            batch = admin.call('POST', f'/orders/{oid}/batches', {'expectedOrderVersion': order['version'], 'items': rows})
            if decision == 'approve':
                kitchen.call('POST', f"/batches/{batch['batchId']}/approve", {'expectedVersion': batch['version']})
            elif decision == 'reject':
                kitchen.call('POST', f"/batches/{batch['batchId']}/reject", {'expectedVersion': batch['version'], 'reason': 'O4: từ chối đợt gọi thêm.'})
            else:
                admin.call('POST', f"/batches/{batch['batchId']}/withdraw", {'expectedVersion': batch['version']})
            if decision != 'approve':
                for ln in lines[-len(rows):]:
                    ln['final'] = 'REJECTED' if decision == 'reject' else 'CANCELLED'
        by_note = lambda: {i['note']: i for i in all_items(admin.call('GET', f'/orders/{oid}')) if i.get('note')}
        for li in sc.get('cancel_placed', []):
            it = by_note()[lines[li]['note']]
            admin.call('POST', f"/order-items/{it['id']}/cancel", {'expectedVersion': it['version'], 'reason': 'O4: khách đổi ý trước khi nấu.'})
            lines[li]['final'] = 'CANCELLED'
        for li in sc.get('cancel_cooked', []):
            it = by_note()[lines[li]['note']]
            cur = kitchen.call('POST', f"/order-items/{it['id']}/accept", {'expectedVersion': it['version']})
            cur = kitchen.call('POST', f"/order-items/{it['id']}/prepare", {'expectedVersion': cur['version']})
            admin.call('POST', f"/order-items/{it['id']}/cancel", {'expectedVersion': cur['version'], 'reason': 'O4: món không đạt, quản lý hủy.'})
            lines[li]['final'] = 'CANCELLED'
        cook_and_serve(kitchen, admin, oid, admin)
    finally:
        if restore:
            admin.call('PATCH', f'/menu-items/{restore[0]}', {'expectedVersion': restore[1], 'priceVnd': restore[2]})

    expected = sum(ln['item']['priceVnd'] * ln['qty'] for ln in lines if ln['final'] == 'SERVED')
    stored = by_note()
    status_ok = all(stored[ln['note']]['status'] == ln['final'] for ln in lines)
    order = admin.call('GET', f'/orders/{oid}')
    t0 = time.perf_counter()
    checkout = cashier.call('POST', f'/orders/{oid}/request-payment', {'expectedVersion': order['version']})
    timings['request_payment'].append(ms_since(t0))
    neg = {}
    method = sc['method']
    if expected > 0:
        try:
            cashier.call('POST', f'/orders/{oid}/payments', {'expectedVersion': checkout['version'], 'method': 'BANK_TRANSFER', 'amountVnd': expected + 1000,
                                                            'tenderedVnd': None, 'transferReference': 'O4-SAI-SO-TIEN'}, expected=409)
            neg['amount_mismatch_blocked'] = True
        except AssertionError as e:
            neg['amount_mismatch_blocked'] = str(e)[:200]
        try:
            cashier.call('POST', f'/orders/{oid}/payments', {'expectedVersion': checkout['version'], 'method': 'CASH', 'amountVnd': expected,
                                                            'tenderedVnd': expected - 1, 'transferReference': None}, expected=422)
            neg['cash_short_blocked'] = True
        except AssertionError as e:
            neg['cash_short_blocked'] = str(e)[:200]
    tendered = None
    if method == 'CASH':
        tendered = ((expected // 50000) + 1) * 50000
    body = {'expectedVersion': checkout['version'], 'method': method, 'amountVnd': checkout['totalVnd'], 'tenderedVnd': tendered,
            'transferReference': 'O4-' + uuid.uuid4().hex[:10].upper() if method == 'BANK_TRANSFER' else None}
    t0 = time.perf_counter()
    payment = cashier.call('POST', f'/orders/{oid}/payments', body)
    timings['payment'].append(ms_since(t0))
    receipt = cashier.call('GET', f'/orders/{oid}/receipt')
    history = admin.call('GET', f"/admin/payments/{payment['id']}")
    checks = {
        'checkout_total_equals_expected': checkout['totalVnd'] == expected,
        'receipt_amount_equals_expected': receipt['amountVnd'] == expected,
        'receipt_order_total_equals_expected': receipt['order']['totalVnd'] == expected,
        'change_correct': receipt['changeVnd'] == (None if tendered is None else tendered - expected),
        'history_amount_equals_expected': history['amountVnd'] == expected,
        'line_statuses_as_expected': status_ok,
        'order_paid': receipt['order']['status'] == 'PAID',
    }
    checks.update({k: v is True for k, v in neg.items()})
    return {'scenario': sc['name'], 'orderId': oid, 'method': payment['method'], 'expected_total_vnd': expected,
            'checkout_total_vnd': checkout['totalVnd'], 'receipt_amount_vnd': receipt['amountVnd'], 'checks': checks,
            'negative_details': neg, 'match': all(checks.values())}


def prepare_timing(n, admin, kitchen):
    menu = available_items(admin, 3)
    out = []
    for k in range(n):
        created = admin.call('POST', '/takeaway-orders', {'pickupName': f'O4 bấm giờ {k + 1}', 'items': [row(menu[k % 3], k % 3 + 1), row(menu[(k + 1) % 3], 1)]})
        cook_and_serve(kitchen, admin, created['orderId'], admin)
        order = admin.call('GET', f"/orders/{created['orderId']}")
        checkout = admin.call('POST', f"/orders/{created['orderId']}/request-payment", {'expectedVersion': order['version']})
        out.append({'orderCode': created.get('code'), 'pickupCode': created.get('pickupCode'),
                    'totalVnd': checkout['totalVnd']})
    print('Đã tạo các đơn CHỜ THANH TOÁN để bấm giờ trên trang Thu ngân:')
    for o in out:
        print(f"  {o['orderCode']}  mã nhận {o['pickupCode']}  tổng {o['totalVnd']:,}đ")
    print('Ghi kết quả vào docs/verification/perf/o4-thu-tien-bam-gio.csv')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--prepare-timing', type=int, default=0, help='Chỉ tạo N đơn chờ thanh toán cho phần bấm giờ thủ công')
    args = ap.parse_args()
    admin, kitchen, cashier = login('admin'), login('kitchen'), login('cashier')
    if args.prepare_timing:
        prepare_timing(args.prepare_timing, admin, kitchen)
        return
    menu = available_items(admin, 3)
    timings = {'request_payment': [], 'payment': []}
    results = []
    for sc in SCENARIOS:
        try:
            results.append(run_scenario(sc, menu, admin, kitchen, cashier, timings))
        except AssertionError as e:
            results.append({'scenario': sc['name'], 'match': False, 'error': str(e)[:400]})
        print(('KHỚP ' if results[-1]['match'] else 'LỆCH ') + sc['name'])
    matched = sum(1 for r in results if r['match'])
    result = {
        'objective': 'O4', 'target': '100% hóa đơn khớp tiền; thao tác thu tiền ≤ 1 phút/đơn',
        'environment': environment(),
        'invoices': len(results), 'invoices_matched': matched,
        'match_rate_percent': round(matched / len(results) * 100, 1),
        'api_latency': {k: summarize_ms(v) for k, v in timings.items()},
        'scenarios': results,
        'result': 'PASS' if matched == len(results) else 'FAIL',
        'note': 'Vế "≤ 1 phút" đo thủ công: chạy --prepare-timing 5 rồi ghi vào o4-thu-tien-bam-gio.csv. '
                'Ca 09 tạm đổi giá menu (+5.000đ) rồi trả lại giá cũ; nên chạy trên môi trường đo riêng.',
    }
    path = write_result('o4-billing-result', result)
    print(json.dumps({k: result[k] for k in ('result', 'invoices', 'invoices_matched', 'match_rate_percent')}, ensure_ascii=False))
    print('Đã ghi', path)


if __name__ == '__main__':
    main()
