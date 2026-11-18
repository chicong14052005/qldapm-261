# GET /api/v1/admin/payments/{id}

Admin xem đầy đủ đơn và người nhận thanh toán. **Quyền:** ADMIN.

Hợp đồng test của endpoint đã implement; nghiệp vụ do [SSOT P1.7](../../SSOT/P1.7-thanh-toan-va-hoan-tat.md) sở hữu. Các chuỗi `<...>` trong response là giá trị minh họa cần thay bằng dữ liệu server thật.

## URL và headers

`GET {{baseUrl}}/api/v1/admin/payments/{{paymentId}}`

`Content-Type: application/json`

- Cookie jar giữ phiên đăng nhập/tham gia. Với request khách, thêm `X-Actor: guest`.

## Payload đầy đủ cho kịch bản mẫu

Không có request body.

## Response thành công — HTTP 200

```json
{
  "id": "<paymentId>",
  "orderId": "<orderId>",
  "receiptNo": "BN-C1D2E3F4A5B678",
  "method": "CASH",
  "amountVnd": 190000,
  "tenderedVnd": 200000,
  "transferReference": null,
  "paidAt": "2026-11-03T04:15:20Z",
  "changeVnd": 10000,
  "receivedBy": {
    "staffId": "10000000-0000-0000-0000-000000000003",
    "username": "cashier",
    "displayName": "Nhân viên thu ngân",
    "snapshotAvailable": true
  },
  "order": {
    "id": "<orderId>",
    "code": "DH-4C8AA1B2C3D4",
    "orderType": "DINE_IN",
    "tableCode": "B01",
    "visitId": "<visitId>",
    "pickupCode": null,
    "pickupName": null,
    "status": "PAID",
    "version": 9,
    "totalVnd": 190000,
    "subtotalVnd": 190000,
    "pendingVnd": 0,
    "createdAt": "2026-11-02T15:00:00Z",
    "batches": [
      {
        "id": "<batchId>",
        "sequenceNo": 1,
        "status": "APPROVED",
        "version": 1,
        "createdAt": "2026-11-02T15:01:00Z",
        "decisionReason": null,
        "reviewedAt": null,
        "eligibleAt": "2026-11-02T15:01:00Z",
        "submittedByStaffId": null,
        "items": [
          {
            "id": "<itemId>",
            "batchId": "<batchId>",
            "menuItemId": "30000000-0000-0000-0000-000000000006",
            "menuCodeSnapshot": "MON-006",
            "menuNameSnapshot": "Cơm chiên hải sản",
            "quantity": 2,
            "unitPriceVnd": 95000,
            "note": "Ít cay, không hành",
            "status": "SERVED",
            "version": 1,
            "statusChangedAt": "2026-11-02T15:01:00Z",
            "createdAt": "2026-11-02T15:01:00Z",
            "updatedAt": "2026-11-02T15:01:00Z"
          }
        ]
      }
    ]
  }
}
```

id là paymentId, không phải orderId. Trả thời điểm UTC, ID/username/họ tên người nhận tại thời điểm ghi nhận, tiền nhận/trả lại/reference và toàn bộ đợt/dòng món, kể cả hủy/từ chối/rút. Dữ liệu chỉ đọc, không thay đổi khi tên nhân viên hoặc menu đổi. 404 nếu payment không tồn tại. Không xóa/khôi phục dữ liệu dev cũ.

## Cách thử và lỗi cần kiểm tra

1. Xem [hướng dẫn Postman](POSTMAN.md), đăng nhập đúng role hoặc tham gia lượt.
2. Lấy ID thật từ response tạo/danh sách. Với command, lấy version mới nhất của **đúng thực thể** trước khi gửi; số `1` ở ví dụ không luôn là version hiện tại.
3. Gửi payload mẫu. Thành công trả 200; kiểm tra lại GET tài nguyên để xác nhận dữ liệu.
4. Với lệnh ghi: gửi lại cùng key/payload để kiểm tra chống lặp khi API hỗ trợ idempotency. Không đổi key khi chưa rõ kết quả request trước.

Các lỗi chung: 400 JSON/key sai; 401 hết phiên; 403 sai quyền/CSRF; 404 tài nguyên không thuộc quyền; 409 version/trạng thái/mã trùng/món hết; 410 replay hết hạn; 422 trường sai; 429 quá số lần. Lỗi dùng `{type,title,status,code,detail,traceId}`; không có side effect khi transaction thất bại. GET/login/join/logout không lưu idempotency record; command nghiệp vụ mới có replay.
