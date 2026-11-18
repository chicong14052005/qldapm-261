# POST /api/v1/takeaway-orders

Tạo đơn mang về và đợt đầu. **Quyền:** WAITER / CASHIER / MANAGER / ADMIN.

Hợp đồng test của endpoint đã implement; nghiệp vụ do [SSOT P1.4](../../SSOT/P1.4-dat-mon-va-dieu-chinh-don.md) sở hữu. Các chuỗi `<...>` trong response là giá trị minh họa cần thay bằng dữ liệu server thật.

## URL và headers

`POST {{baseUrl}}/api/v1/takeaway-orders`

`Content-Type: application/json`

- `X-CSRF-TOKEN: <token lấy từ GET /api/v1/auth/csrf>`
- `Idempotency-Key: <UUID mới cho một ý định; retry giữ nguyên>`

- Cookie jar giữ phiên đăng nhập/tham gia. Với request khách, thêm `X-Actor: guest`.

## Payload đầy đủ cho kịch bản mẫu

```json
{
  "pickupName": "Nguyễn Minh Anh",
  "items": [
    {
      "menuItemId": "30000000-0000-0000-0000-000000000006",
      "quantity": 2,
      "observedPriceVnd": 95000,
      "note": "Ít cay, không hành"
    }
  ]
}
```

## Response thành công — HTTP 200

```json
{
  "orderId": "<orderId>",
  "code": "DH-A817B21C9D32",
  "pickupCode": "MV-8BC179D2",
  "orderVersion": 1,
  "batchId": "<batchId>",
  "status": "APPROVED",
  "version": 1
}
```

Không tableId/visitId. pickupName tùy chọn, không bắt buộc số điện thoại. Đợt đầu tự duyệt; chỉ thu tiền sau bàn giao.

## Cách thử và lỗi cần kiểm tra

1. Xem [hướng dẫn Postman](POSTMAN.md), đăng nhập đúng role hoặc tham gia lượt.
2. Lấy ID thật từ response tạo/danh sách. Với command, lấy version mới nhất của **đúng thực thể** trước khi gửi; số `1` ở ví dụ không luôn là version hiện tại.
3. Gửi payload mẫu. Thành công trả 200; kiểm tra lại GET tài nguyên để xác nhận dữ liệu.
4. Với lệnh ghi: gửi lại cùng key/payload để kiểm tra chống lặp khi API hỗ trợ idempotency. Không đổi key khi chưa rõ kết quả request trước.

Các lỗi chung: 400 JSON/key sai; 401 hết phiên; 403 sai quyền/CSRF; 404 tài nguyên không thuộc quyền; 409 version/trạng thái/mã trùng/món hết; 410 replay hết hạn; 422 trường sai; 429 quá số lần. Lỗi dùng `{type,title,status,code,detail,traceId}`; không có side effect khi transaction thất bại. GET/login/join/logout không lưu idempotency record; command nghiệp vụ mới có replay.
