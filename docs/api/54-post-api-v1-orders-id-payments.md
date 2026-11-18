# POST /api/v1/orders/{id}/payments

Xác nhận thực nhận tiền. **Quyền:** CASHIER / MANAGER / ADMIN.

Hợp đồng test của endpoint đã implement; nghiệp vụ do [SSOT P1.7](../../SSOT/P1.7-thanh-toan-va-hoan-tat.md) sở hữu. Các chuỗi `<...>` trong response là giá trị minh họa cần thay bằng dữ liệu server thật.

## URL và headers

`POST {{baseUrl}}/api/v1/orders/{{orderId}}/payments`

`Content-Type: application/json`

- `X-CSRF-TOKEN: <token lấy từ GET /api/v1/auth/csrf>`
- `Idempotency-Key: <UUID mới cho một ý định; retry giữ nguyên>`

- Cookie jar giữ phiên đăng nhập/tham gia. Với request khách, thêm `X-Actor: guest`.

## Payload đầy đủ cho kịch bản mẫu

```json
{
  "expectedVersion": 1,
  "method": "CASH",
  "amountVnd": 190000,
  "tenderedVnd": 200000,
  "transferReference": null
}
```

## Response thành công — HTTP 200

```json
{
  "id": "<paymentId>",
  "receiptNo": "BN-C1D2E3F4A5B678",
  "method": "CASH",
  "amountVnd": 190000,
  "paidAt": "2026-11-02T15:30:00Z",
  "changeVnd": 10000,
  "orderStatus": "PAID",
  "orderVersion": 9,
  "receivedBy": {
    "staffId": "10000000-0000-0000-0000-000000000003",
    "username": "cashier",
    "displayName": "Nhân viên thu ngân",
    "snapshotAvailable": true
  }
}
```

amountVnd bằng tổng chốt. BANK_TRANSFER: tenderedVnd=null, transferReference="VCB-20261102-153022-001"; ZERO: amountVnd=0, tenderedVnd=null, transferReference=null. Không thu hai lần/order. Chốt payment/order/visit/revoke khách cùng transaction. Server tự chụp snapshot người đang xác nhận và thời gian UTC; client không gửi receivedBy/paidAt để quyết định các giá trị này.

## Cách thử và lỗi cần kiểm tra

1. Xem [hướng dẫn Postman](POSTMAN.md), đăng nhập đúng role hoặc tham gia lượt.
2. Lấy ID thật từ response tạo/danh sách. Với command, lấy version mới nhất của **đúng thực thể** trước khi gửi; số `1` ở ví dụ không luôn là version hiện tại.
3. Gửi payload mẫu. Thành công trả 200; kiểm tra lại GET tài nguyên để xác nhận dữ liệu.
4. Với lệnh ghi: gửi lại cùng key/payload để kiểm tra chống lặp khi API hỗ trợ idempotency. Không đổi key khi chưa rõ kết quả request trước.

Các lỗi chung: 400 JSON/key sai; 401 hết phiên; 403 sai quyền/CSRF; 404 tài nguyên không thuộc quyền; 409 version/trạng thái/mã trùng/món hết; 410 replay hết hạn; 422 trường sai; 429 quá số lần. Lỗi dùng `{type,title,status,code,detail,traceId}`; không có side effect khi transaction thất bại. GET/login/join/logout không lưu idempotency record; command nghiệp vụ mới có replay.
