# GET /api/v1/tables/{id}/qr

Xem lại QR và URL cố định của bàn. **Quyền:** WAITER / MANAGER / ADMIN.

Hợp đồng test của endpoint đã implement; nghiệp vụ do [SSOT P1.3](../../SSOT/P1.3-ban-va-luot-khach.md) sở hữu. Các chuỗi `<...>` trong response là giá trị minh họa cần thay bằng dữ liệu server thật.

## URL và headers

`GET {{baseUrl}}/api/v1/tables/{{tableId}}/qr`

`Content-Type: application/json`

- Cookie jar giữ phiên đăng nhập/tham gia. Với request khách, thêm `X-Actor: guest`.

## Payload đầy đủ cho kịch bản mẫu

Không có request body.

## Response thành công — HTTP 200

```json
{
  "id": "<tableId>",
  "code": "B01",
  "version": 1,
  "qrToken": "<token cố định>",
  "qrPath": "/qr/<token>",
  "qrUrl": "http://localhost:3000/qr/<token>"
}
```

GET chỉ đọc, không đổi token/version. QR dùng lại qua nhiều lượt và restart. UI sinh ảnh QR từ đúng qrUrl này, có ô URL và nút sao chép. Không cần joinCode. PublicOrigin xác định host/port trong link.

## Cách thử và lỗi cần kiểm tra

1. Xem [hướng dẫn Postman](POSTMAN.md), đăng nhập đúng role hoặc tham gia lượt.
2. Lấy ID thật từ response tạo/danh sách. Với command, lấy version mới nhất của **đúng thực thể** trước khi gửi; số `1` ở ví dụ không luôn là version hiện tại.
3. Gửi payload mẫu. Thành công trả 200; kiểm tra lại GET tài nguyên để xác nhận dữ liệu.
4. Với lệnh ghi: gửi lại cùng key/payload để kiểm tra chống lặp khi API hỗ trợ idempotency. Không đổi key khi chưa rõ kết quả request trước.

Các lỗi chung: 400 JSON/key sai; 401 hết phiên; 403 sai quyền/CSRF; 404 tài nguyên không thuộc quyền; 409 version/trạng thái/mã trùng/món hết; 410 replay hết hạn; 422 trường sai; 429 quá số lần. Lỗi dùng `{type,title,status,code,detail,traceId}`; không có side effect khi transaction thất bại. GET/login/join/logout không lưu idempotency record; command nghiệp vụ mới có replay.
