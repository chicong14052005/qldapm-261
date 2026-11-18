# GET /api/v1/admin/payments

Admin tra cứu toàn bộ lịch sử thanh toán. **Quyền:** ADMIN.

Hợp đồng test của endpoint đã implement; nghiệp vụ do [SSOT P1.7](../../SSOT/P1.7-thanh-toan-va-hoan-tat.md) sở hữu. Các chuỗi `<...>` trong response là giá trị minh họa cần thay bằng dữ liệu server thật.

## URL và headers

`GET {{baseUrl}}/api/v1/admin/payments`

`Content-Type: application/json`

- Cookie jar giữ phiên đăng nhập/tham gia. Với request khách, thêm `X-Actor: guest`.

## Payload đầy đủ cho kịch bản mẫu

Không có request body.

## Response thành công — HTTP 200

```json
{
  "items": [
    {
      "paymentId": "<paymentId>",
      "orderId": "<orderId>",
      "orderCode": "DH-4C8AA1B2C3D4",
      "orderType": "DINE_IN",
      "tableCode": "B01",
      "pickupCode": null,
      "pickupName": null,
      "createdAt": "2026-11-03T03:15:00Z",
      "receiptNo": "BN-C1D2E3F4A5B678",
      "method": "CASH",
      "amountVnd": 190000,
      "tenderedVnd": 200000,
      "changeVnd": 10000,
      "transferReference": null,
      "paidAt": "2026-11-03T04:15:20Z",
      "receivedBy": {
        "staffId": "10000000-0000-0000-0000-000000000003",
        "username": "cashier",
        "displayName": "Nhân viên thu ngân",
        "snapshotAvailable": true
      }
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 1,
  "totalPages": 1
}
```

Query tùy chọn: search (mã đơn/biên nhận/bàn/mã nhận/tên người nhận), fromDate=2026-11-03, toDate=2026-11-03, method=CASH|BANK_TRANSFER|ZERO, orderType=DINE_IN|TAKEAWAY, receivedByStaffId=<UUID>, page=1, pageSize=20 (tối đa100). Ngày theo UTC+07:00, fromDate bắt đầu ngày và toDate hết ngày. Không giới hạn200 đơn: phân trang tới hết lịch sử. Sort paidAt DESC,id DESC. Chỉ gồm PAID, gồm cả tổng0. Không role khác truy cập được. Tên người nhận là snapshot lúc thu; dữ liệu dev trước migration004 không backfill: username/displayName=null, snapshotAvailable=false.

## Cách thử và lỗi cần kiểm tra

1. Xem [hướng dẫn Postman](POSTMAN.md), đăng nhập đúng role hoặc tham gia lượt.
2. Lấy ID thật từ response tạo/danh sách. Với command, lấy version mới nhất của **đúng thực thể** trước khi gửi; số `1` ở ví dụ không luôn là version hiện tại.
3. Gửi payload mẫu. Thành công trả 200; kiểm tra lại GET tài nguyên để xác nhận dữ liệu.
4. Với lệnh ghi: gửi lại cùng key/payload để kiểm tra chống lặp khi API hỗ trợ idempotency. Không đổi key khi chưa rõ kết quả request trước.

Các lỗi chung: 400 JSON/key sai; 401 hết phiên; 403 sai quyền/CSRF; 404 tài nguyên không thuộc quyền; 409 version/trạng thái/mã trùng/món hết; 410 replay hết hạn; 422 trường sai; 429 quá số lần. Lỗi dùng `{type,title,status,code,detail,traceId}`; không có side effect khi transaction thất bại. GET/login/join/logout không lưu idempotency record; command nghiệp vụ mới có replay.
