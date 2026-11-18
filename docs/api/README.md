# Danh mục API thực thi

**56 endpoint** · Base URL: `http://localhost:3000` · [Hướng dẫn Postman](POSTMAN.md).

| Method | API | Tài liệu |
|---|---|---|
| GET | `/health/live` | [Kiểm tra tiến trình](01-get-health-live.md) |
| GET | `/health/ready` | [Kiểm tra kết nối database](02-get-health-ready.md) |
| GET | `/api/v1/auth/csrf` | [Lấy CSRF token](03-get-api-v1-auth-csrf.md) |
| GET | `/api/v1/openapi.json` | [Hợp đồng OpenAPI](04-get-api-v1-openapi-json.md) |
| POST | `/api/v1/auth/login` | [Đăng nhập nhân viên](05-post-api-v1-auth-login.md) |
| GET | `/api/v1/auth/me` | [Đọc phiên hiện tại](06-get-api-v1-auth-me.md) |
| POST | `/api/v1/auth/logout` | [Đăng xuất](07-post-api-v1-auth-logout.md) |
| POST | `/api/v1/auth/change-password` | [Đổi mật khẩu](08-post-api-v1-auth-change-password.md) |
| GET | `/api/v1/staff` | [Danh sách nhân viên](09-get-api-v1-staff.md) |
| POST | `/api/v1/staff` | [Tạo nhân viên](10-post-api-v1-staff.md) |
| PATCH | `/api/v1/staff/{id}` | [Sửa/khóa nhân viên](11-patch-api-v1-staff-id.md) |
| PUT | `/api/v1/staff/{id}/roles` | [Thay bộ vai trò nhân viên](12-put-api-v1-staff-id-roles.md) |
| POST | `/api/v1/staff/{id}/reset-password` | [Đặt mật khẩu tạm](13-post-api-v1-staff-id-reset-password.md) |
| GET | `/api/v1/menu` | [Xem thực đơn](14-get-api-v1-menu.md) |
| GET | `/api/v1/manage/menu-items` | [Xem cả món ẩn](15-get-api-v1-manage-menu-items.md) |
| POST | `/api/v1/menu-categories` | [Thêm danh mục](16-post-api-v1-menu-categories.md) |
| PATCH | `/api/v1/menu-categories/{id}` | [Sửa/ẩn danh mục](17-patch-api-v1-menu-categories-id.md) |
| POST | `/api/v1/menu-items` | [Thêm món ăn](18-post-api-v1-menu-items.md) |
| PATCH | `/api/v1/menu-items/{id}` | [Sửa/ẩn món](19-patch-api-v1-menu-items-id.md) |
| PATCH | `/api/v1/menu-items/{id}/availability` | [Bật/tắt còn món](20-patch-api-v1-menu-items-id-availability.md) |
| GET | `/api/v1/tables` | [Sơ đồ bàn và lượt đang mở](21-get-api-v1-tables.md) |
| POST | `/api/v1/tables` | [Thêm bàn](22-post-api-v1-tables.md) |
| PATCH | `/api/v1/tables/{id}` | [Sửa/ẩn bàn trống](23-patch-api-v1-tables-id.md) |
| POST | `/api/v1/tables/{id}/qr/rotate` | [Thay QR cố định khi cần vô hiệu link cũ](24-post-api-v1-tables-id-qr-rotate.md) |
| POST | `/api/v1/tables/{id}/qr/unlock` | [Mở khóa QR bàn đang có khách để cấp phiên mới](25-post-api-v1-tables-id-qr-unlock.md) |
| GET | `/api/v1/tables/{id}/qr` | [Xem lại QR và URL cố định của bàn](26-get-api-v1-tables-id-qr.md) |
| GET | `/api/v1/qr/{token}` | [Đọc thông tin QR công khai](27-get-api-v1-qr-token.md) |
| POST | `/api/v1/tables/{id}/visits` | [Mở lượt khách](28-post-api-v1-tables-id-visits.md) |
| POST | `/api/v1/guest/join` | [Khách tham gia lượt đang mở bằng QR cố định](29-post-api-v1-guest-join.md) |
| GET | `/api/v1/guest/current` | [Lượt hiện tại của khách](30-get-api-v1-guest-current.md) |
| GET | `/api/v1/orders` | [Danh sách đơn](31-get-api-v1-orders.md) |
| GET | `/api/v1/orders/{id}` | [Chi tiết đơn và mọi đợt gọi](32-get-api-v1-orders-id.md) |
| POST | `/api/v1/takeaway-orders` | [Tạo đơn mang về và đợt đầu](33-post-api-v1-takeaway-orders.md) |
| POST | `/api/v1/orders/{id}/batches` | [Gửi đợt món đầu/gọi thêm](34-post-api-v1-orders-id-batches.md) |
| GET | `/api/v1/approval-batches` | [Đợt gọi thêm chờ duyệt](35-get-api-v1-approval-batches.md) |
| POST | `/api/v1/batches/{id}/approve` | [Duyệt toàn đợt](36-post-api-v1-batches-id-approve.md) |
| POST | `/api/v1/batches/{id}/reject` | [Từ chối toàn đợt](37-post-api-v1-batches-id-reject.md) |
| POST | `/api/v1/batches/{id}/withdraw` | [Rút toàn đợt chờ](38-post-api-v1-batches-id-withdraw.md) |
| GET | `/api/v1/kitchen/items` | [Hàng đợi chế biến](39-get-api-v1-kitchen-items.md) |
| GET | `/api/v1/kitchen/changes` | [Lịch sử sửa/hủy gần đây](40-get-api-v1-kitchen-changes.md) |
| POST | `/api/v1/order-items/{id}/accept` | [Bếp tiếp nhận món](41-post-api-v1-order-items-id-accept.md) |
| POST | `/api/v1/order-items/{id}/prepare` | [Bắt đầu chuẩn bị](42-post-api-v1-order-items-id-prepare.md) |
| POST | `/api/v1/order-items/{id}/ready` | [Bếp hoàn thành món](43-post-api-v1-order-items-id-ready.md) |
| PATCH | `/api/v1/order-items/{id}` | [Giảm số lượng/sửa ghi chú trước nấu](44-patch-api-v1-order-items-id.md) |
| POST | `/api/v1/order-items/{id}/cancel` | [Hủy dòng món](45-post-api-v1-order-items-id-cancel.md) |
| POST | `/api/v1/orders/{id}/cancel` | [Hủy đơn chưa từng bắt đầu nấu](46-post-api-v1-orders-id-cancel.md) |
| GET | `/api/v1/serving/items` | [Danh sách món READY](47-get-api-v1-serving-items.md) |
| POST | `/api/v1/order-items/{id}/serve` | [Xác nhận bàn giao món](48-post-api-v1-order-items-id-serve.md) |
| GET | `/api/v1/checkout/orders` | [Đơn đang chờ thu tiền](49-get-api-v1-checkout-orders.md) |
| GET | `/api/v1/admin/payments` | [Admin tra cứu toàn bộ lịch sử thanh toán](50-get-api-v1-admin-payments.md) |
| GET | `/api/v1/admin/payments/{id}` | [Admin xem đầy đủ đơn và người nhận thanh toán](51-get-api-v1-admin-payments-id.md) |
| POST | `/api/v1/orders/{id}/request-payment` | [Xin thanh toán và chốt tiền](52-post-api-v1-orders-id-request-payment.md) |
| POST | `/api/v1/orders/{id}/reopen` | [Mở lại đơn chờ trả](53-post-api-v1-orders-id-reopen.md) |
| POST | `/api/v1/orders/{id}/payments` | [Xác nhận thực nhận tiền](54-post-api-v1-orders-id-payments.md) |
| GET | `/api/v1/orders/{id}/receipt` | [Biên nhận nội bộ](55-get-api-v1-orders-id-receipt.md) |
| GET | `/api/v1/requests/{key}` | [Tra kết quả theo Idempotency-Key](56-get-api-v1-requests-key.md) |
