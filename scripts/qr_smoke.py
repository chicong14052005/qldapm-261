"""Fixed-table QR regression with single-active-guest lock; uses separate cookie jars, preserves all images/data."""
import json
from pathlib import Path
from smoke import Client, checks


def main():
    admin, waiter, a, b, anonymous = Client(), Client(), Client(True), Client(True), Client()
    admin.login('admin')
    waiter.login('waiter')
    tables = [t for t in waiter.call('GET', '/tables')['items'] if t['isActive'] and not t['visit']]
    assert len(tables) >= 2, 'Need two empty active tables for this test.'
    table, other = tables[:2]
    tid = table['id']
    anonymous.call('GET', f'/tables/{tid}/qr', expected=401)
    qr = waiter.call('GET', f'/tables/{tid}/qr')
    assert qr == waiter.call('GET', f'/tables/{tid}/qr'), 'Viewing QR must not rotate or change version'
    assert qr['qrUrl'].endswith(qr['qrPath']) and qr['qrPath'] == '/qr/' + qr['qrToken']
    assert qr['qrUrl'].startswith('http://localhost:')
    pub = anonymous.call('GET', '/qr/' + qr['qrToken'])
    assert not pub['hasOpenVisit'] and not pub['hasActiveGuestSession']
    a.call('POST', '/guest/join', {'qrToken': qr['qrToken']}, expected=409)
    visit = waiter.call('POST', f'/tables/{tid}/visits', {'partySize': 2})
    assert 'joinCode' not in visit
    pub_open = anonymous.call('GET', '/qr/' + qr['qrToken'])
    assert pub_open['hasOpenVisit'] and not pub_open['hasActiveGuestSession']
    first = a.call('POST', '/guest/join', {'qrToken': qr['qrToken']})
    identity = a.call('GET', '/auth/me')['id']
    assert a.call('POST', '/guest/join', {'qrToken': qr['qrToken']}) == first
    assert a.call('GET', '/auth/me')['id'] == identity, 'Reload must reuse guest session'
    assert anonymous.call('GET', '/qr/' + qr['qrToken'])['hasActiveGuestSession']
    # Second device must be blocked while first guest holds an active session.
    b.call('POST', '/guest/join', {'qrToken': qr['qrToken']}, expected=409)
    b.call('GET', '/guest/current', expected=401)
    # Explicit guest logout frees the QR for another scan within the same open visit.
    a.call('POST', '/auth/logout', {})
    a.call('GET', '/guest/current', expected=401)
    second = b.call('POST', '/guest/join', {'qrToken': qr['qrToken']})
    assert second['orderId'] == visit['orderId'] and second['visitId'] == visit['visitId']
    assert b.call('GET', '/auth/me')['id'] != identity
    a.call('POST', '/guest/join', {'qrToken': qr['qrToken']}, expected=409)
    # Staff can unlock QR on an active table to revoke old session without cancelling the order.
    unlocked = waiter.call('POST', f'/tables/{tid}/qr/unlock', {})
    assert unlocked['revokedCount'] == 1
    b.call('GET', '/guest/current', expected=401)
    reclaimed = a.call('POST', '/guest/join', {'qrToken': qr['qrToken']})
    assert reclaimed['orderId'] == visit['orderId']
    a.call('GET', f'/tables/{tid}/qr', expected=403)
    a.call('POST', '/guest/join', {'qrToken': '0' * 64}, expected=404)
    a.call('POST', '/guest/join', {}, expected=422)
    other_visit = waiter.call('POST', f"/tables/{other['id']}/visits", {'partySize': 1})
    a.call('GET', f"/orders/{other_visit['orderId']}", expected=404)
    a.call('POST', f"/orders/{other_visit['orderId']}/batches", {'expectedOrderVersion': 1, 'items': []}, expected=404)
    order = waiter.call('GET', f"/orders/{visit['orderId']}")
    waiter.call('POST', f"/orders/{visit['orderId']}/cancel", {'expectedVersion': order['version'], 'reason': 'Kết thúc lượt trống kiểm tra QR.'})
    a.call('GET', '/guest/current', expected=401)
    b.call('GET', '/guest/current', expected=401)
    a.call('POST', '/guest/join', {'qrToken': qr['qrToken']}, expected=409)
    assert qr['qrUrl'] == waiter.call('GET', f'/tables/{tid}/qr')['qrUrl']
    new_visit = waiter.call('POST', f'/tables/{tid}/visits', {'partySize': 2})
    assert new_visit['visitId'] != visit['visitId'] and new_visit['orderId'] != visit['orderId']
    # Old cookie alone never gains access to the new visit; explicit QR join is required.
    a.call('GET', '/guest/current', expected=401)
    joined = a.call('POST', '/guest/join', {'qrToken': qr['qrToken']})
    assert joined['orderId'] == new_visit['orderId'] and a.call('GET', '/auth/me')['id'] != identity
    a.call('GET', f"/orders/{visit['orderId']}", expected=404)
    b.call('GET', '/guest/current', expected=401)
    latest_qr = admin.call('GET', f'/tables/{tid}/qr')
    assert latest_qr['qrToken'] == qr['qrToken']
    rotated = admin.call('POST', f'/tables/{tid}/qr/rotate', {'expectedVersion': latest_qr['version']})
    assert rotated['qrToken'] != qr['qrToken']
    anonymous.call('GET', '/qr/' + qr['qrToken'], expected=404)
    b.call('POST', '/guest/join', {'qrToken': qr['qrToken']}, expected=404)
    assert a.call('GET', '/guest/current')['orderId'] == new_visit['orderId'], 'QR replacement should not end an existing visit'
    a.call('POST', '/auth/logout', {})
    assert b.call('POST', '/guest/join', {'qrToken': rotated['qrToken']})['orderId'] == new_visit['orderId']
    for current in [new_visit, other_visit]:
        order = waiter.call('GET', f"/orders/{current['orderId']}")
        waiter.call('POST', f"/orders/{current['orderId']}/cancel", {'expectedVersion': order['version'], 'reason': 'Hoàn tất kiểm tra phiên QR cố định.'})
    current = next(t for t in admin.call('GET', '/tables')['items'] if t['id'] == tid)
    inactive = admin.call('PATCH', f'/tables/{tid}', {'expectedVersion': current['version'], 'isActive': False})
    try:
        anonymous.call('GET', '/qr/' + rotated['qrToken'], expected=404)
        a.call('POST', '/guest/join', {'qrToken': rotated['qrToken']}, expected=404)
    finally:
        admin.call('PATCH', f'/tables/{tid}', {'expectedVersion': inactive['version'], 'isActive': True})
    result = {
        'result': 'PASS',
        'http_checks': len(checks),
        'checks': checks,
        'scenarios': [
            'fixed QR repeat reads',
            'no join code',
            'table not opened',
            'single active guest session lock (second device blocked 409)',
            'same cookie reused on reload',
            'explicit guest logout releases QR',
            'staff unlock QR revokes active guest session without closing visit',
            'wrong table ownership',
            'closed visit revocation',
            'same QR for new visit',
            'no implicit guest access after close',
            'explicit QR replacement',
            'inactive table',
        ],
    }
    path = Path(__file__).resolve().parents[1] / 'docs/verification/qr-result.json'
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'PASS: {len(checks)} HTTP checks for fixed-table QR, single-guest lock and visit isolation.')


if __name__ == '__main__':
    main()
