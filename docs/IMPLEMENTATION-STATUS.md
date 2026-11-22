# Kế hoạch thực thi và trạng thái MVP

02/11/2026 · Theo yêu cầu ưu tiên chạy ngay; [ADR-0008](../ADR/0008-mvp-local-va-quyet-dinh-trien-khai.md) ghi quyết định/giới hạn.

| Chặng | Tiêu chí bản local | Trạng thái |
|---|---|---|
| 1 | Compose/PG16; backend/frontend đúng folder; migration/seed trước API | Đã chạy |
| 2 | Login, cookie/CSRF/RBAC, tài khoản nội bộ, menu/danh mục/còn-hết | Đã triển khai |
| 3 | Bàn/lượt/QR cố định có ảnh/link/copy, không nhập mã, một order/lượt, takeaway không bàn | Đã triển khai, smoke đạt |
| 4 | Đợt đầu tự duyệt, gọi thêm chờ, approve/reject/withdraw, sửa/hủy/retry | Đã triển khai, smoke đạt |
| 5 | KDS ACCEPTED→PREPARING→READY; phục vụ SERVED; polling | Đã triển khai, smoke đạt |
| 6 | Chốt tiền, CASH/BANK_TRANSFER/ZERO, receipt, đóng lượt/revoke khách | Đã triển khai, smoke đạt |
| 7 | Production build/typecheck, unit test, Markdown từng API, Postman | Đã thực hiện |
| Sau MVP | Tách DB role, non-root backend, metrics, paging/filter đầy đủ, refactor UI | Chưa thực hiện |
| Nghiệm thu mở rộng | Load50, concurrency stress, UAT5 người, restore drill | Chưa thực hiện |

Done bản local: Compose chạy được, luồng chính qua HTTP thật đạt, unit quy tắc đạt, payload và hướng dẫn thử rõ. Mục tiêu nghiệm thu rộng ở ADR-0006 giữ làm backlog; 325giờ là ước lượng nguồn ban đầu, không phải thời gian phải chờ để có bản chạy. Các QC chưa được kiểm tra riêng không tự xem là đạt chỉ vì đã có code.

Cập nhật03/11/2026: migration003, QR cố định, 72 HTTP checks riêng QR, 131 checks luồng chính và3 frontend unit tests copy/fallback. [ADR-0009](../ADR/0009-qr-co-dinh-tai-ban.md).

Cập nhật 03/11/2026: migration004, lịch sử thanh toán ADMIN với snapshot ID/username/tên người thu, thời gian, toàn bộ đơn, lọc và phân trang. 55 endpoints; 25 backend unit + 5 frontend unit; 88 HTTP checks lịch sử và 131 HTTP checks hồi quy. [ADR-0010](../ADR/0010-lich-su-thanh-toan-admin.md). Theo yêu cầu chủ dự án, dữ liệu nghiệp vụ dev được dọn riêng sau kiểm chứng; giữ tài khoản/phân quyền, không xóa Docker images.

03/11/2026 — Hoàn thiện từ điển database: 16 bảng/144 trường/10 trigger functions, metadata catalog chỉ đọc, generator/check offline và hướng dẫn Up/Down theo đúng 4 migration. ADR0003/0004 được đối chiếu hiện trạng; quy trình đồng bộ code/SSOT/ADR/docs ghi ở ADR0011 và AGENTS.md. Không thay runtime/schema, không chạy migration/seed/smoke ghi dữ liệu, không xóa Docker images hoặc dữ liệu.

Cập nhật 18/11/2026: migration005 (`202611180005_SingleActiveGuestPerVisit`), khóa 1 phiên khách hoạt động duy nhất trên mỗi lượt `OPEN` (`409 TABLE_QR_CLAIMED` khi người khác quét), bổ sung API/nút nhân viên **Mở khóa QR** (`POST /api/v1/tables/{id}/qr/unlock`) và đồng bộ 56 endpoints trong OpenAPI/Postman/docs. [ADR-0009](../ADR/0009-qr-co-dinh-tai-ban.md).

Cập nhật 22/11/2026: trang Tài khoản nhân viên dùng ô tick để chọn một hoặc nhiều vai trò khi tạo nhân viên và khi phân quyền (thay ô chọn một vai trò và ô nhập role cách nhau bởi dấu phẩy); bắt buộc chọn ít nhất một vai trò. Không đổi API/schema, đúng quy tắc nhiều role của [SSOT P1.1](../SSOT/P1.1-tai-khoan-va-phan-quyen.md).
