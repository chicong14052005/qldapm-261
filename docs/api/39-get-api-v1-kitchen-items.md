# GET /api/v1/kitchen/items

Hàng đợi chế biến. **Quyền:** KITCHEN / MANAGER / ADMIN.

Hợp đồng test của endpoint đã implement; nghiệp vụ do [SSOT P1.5](../../SSOT/P1.5-xu-ly-mon-tai-bep.md) sở hữu. Các chuỗi `<...>` trong response là giá trị minh họa cần thay bằng dữ liệu server thật.

## URL và headers

`GET {{baseUrl}}/api/v1/kitchen/items`

`Content-Type: application/json`

- Cookie jar giữ phiên đăng nhập/tham gia. Với request khách, thêm `X-Actor: guest`.

## Payload đầy đủ cho kịch bản mẫu

Không có request body.

## Response thành công — HTTP 200

```json
{
  "items": [
    {
      "id": "<itemId>",
      "batchId": "<batchId>",
      "menuItemId": "30000000-0000-0000-0000-000000000006",
      "menuNameSnapshot": "Cơm chiên hải sản",
      "quantity": 2,
      "note": "Ít cay, không hành",
      "status": "PLACED",
      "version": 1,
      "statusChangedAt": "2026-11-02T15:01:00Z",
      "sequenceNo": 1,
      "eligibleAt": "2026-11-02T15:01:00Z",
      "orderId": "<orderId>",
      "orderCode": "DH-4C8AA1B2C3D4",
      "orderType": "DINE_IN",
      "destination": "B01"
    }
  ],
  "serverTime": "2026-11-02T15:01:01Z"
}
```

FIFO theo eligibleAt, chỉ batch APPROVED. Bản local trả toàn bộ queue đang hoạt động, chưa phân trang/lọc category/status.

## Cách thử và lỗi cần kiểm tra

1. Xem [hướng dẫn Postman](POSTMAN.md), đăng nhập đúng role hoặc tham gia lượt.
2. Lấy ID thật từ response tạo/danh sách. Với command, lấy version mới nhất của **đúng thực thể** trước khi gửi; số `1` ở ví dụ không luôn là version hiện tại.
3. Gửi payload mẫu. Thành công trả 200; kiểm tra lại GET tài nguyên để xác nhận dữ liệu.
4. Với lệnh ghi: gửi lại cùng key/payload để kiểm tra chống lặp khi API hỗ trợ idempotency. Không đổi key khi chưa rõ kết quả request trước.

Các lỗi chung: 400 JSON/key sai; 401 hết phiên; 403 sai quyền/CSRF; 404 tài nguyên không thuộc quyền; 409 version/trạng thái/mã trùng/món hết; 410 replay hết hạn; 422 trường sai; 429 quá số lần. Lỗi dùng `{type,title,status,code,detail,traceId}`; không có side effect khi transaction thất bại. GET/login/join/logout không lưu idempotency record; command nghiệp vụ mới có replay.
