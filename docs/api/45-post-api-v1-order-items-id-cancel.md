# POST /api/v1/order-items/{id}/cancel

Hủy dòng món. **Quyền:** Khách/nhân viên đúng quyền trước chuẩn bị; MANAGER/ADMIN khi PREPARING/READY.

Hợp đồng test của endpoint đã implement; nghiệp vụ do [SSOT P1.4](../../SSOT/P1.4-dat-mon-va-dieu-chinh-don.md) sở hữu. Các chuỗi `<...>` trong response là giá trị minh họa cần thay bằng dữ liệu server thật.

## URL và headers

`POST {{baseUrl}}/api/v1/order-items/{{itemId}}/cancel`

`Content-Type: application/json`

- `X-CSRF-TOKEN: <token lấy từ GET /api/v1/auth/csrf>`
- `Idempotency-Key: <UUID mới cho một ý định; retry giữ nguyên>`

- Cookie jar giữ phiên đăng nhập/tham gia. Với request khách, thêm `X-Actor: guest`.

## Payload đầy đủ cho kịch bản mẫu

```json
{
  "expectedVersion": 1,
  "reason": "Khách dị ứng thành phần, quản lý đồng ý hủy."
}
```

## Response thành công — HTTP 200

```json
{
  "id": "<itemId>",
  "status": "CANCELLED",
  "quantity": 2,
  "note": "Ít cay, không hành",
  "version": 2,
  "orderVersion": 5
}
```

expectedVersion là version item. Luồng PLACED→ACCEPTED→PREPARING→READY→SERVED. Không quay lùi/nhảy bước. SERVED không hủy; hủy sau PREPARING/READY bắt buộc lý do và manager/admin.

## Cách thử và lỗi cần kiểm tra

1. Xem [hướng dẫn Postman](POSTMAN.md), đăng nhập đúng role hoặc tham gia lượt.
2. Lấy ID thật từ response tạo/danh sách. Với command, lấy version mới nhất của **đúng thực thể** trước khi gửi; số `1` ở ví dụ không luôn là version hiện tại.
3. Gửi payload mẫu. Thành công trả 200; kiểm tra lại GET tài nguyên để xác nhận dữ liệu.
4. Với lệnh ghi: gửi lại cùng key/payload để kiểm tra chống lặp khi API hỗ trợ idempotency. Không đổi key khi chưa rõ kết quả request trước.

Các lỗi chung: 400 JSON/key sai; 401 hết phiên; 403 sai quyền/CSRF; 404 tài nguyên không thuộc quyền; 409 version/trạng thái/mã trùng/món hết; 410 replay hết hạn; 422 trường sai; 429 quá số lần. Lỗi dùng `{type,title,status,code,detail,traceId}`; không có side effect khi transaction thất bại. GET/login/join/logout không lưu idempotency record; command nghiệp vụ mới có replay.
