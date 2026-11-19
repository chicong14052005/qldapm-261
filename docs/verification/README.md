# Kết quả kiểm tra bản MVP local

Ngày02/11/2026. Chỉ ghi những kiểm tra đã thực hiện; không suy diễn thành nghiệm thu toàn bộ QC.

| Kiểm tra | Kết quả |
|---|---|
| Backend build/publish trong SDK.NET10 container | Đạt |
| Frontend Next16.4.4 production build và TypeScript | Đạt |
| npm dependency audit lúc tạo lockfile | 0 vulnerabilities tại thời điểm kiểm tra |
| Unit tests xUnit | 13/13 đạt: transition, tổng SERVED snapshot, CASH thiếu tiền, transfer thiếu reference, ZERO, version stale |
| HTTP smoke trên PostgreSQL thật qua gateway | Đạt; [smoke-result.json](smoke-result.json) chứa132 kiểm tra ở lần chạy ghi nhận |
| Dine-in + gọi thêm duyệt + CASH + đóng lượt/revoke khách | Đạt trong smoke |
| Manager/admin tự duyệt, reject/withdraw, retry key, RBAC403, món hết409 | Đạt trong smoke |
| BANK_TRANSFER và ZERO sau hủy món đã nấu; chặn hủy toàn đơn sau nấu | Đạt trong smoke |
| Backend/migrate/Frontend/gateway trạng thái cuối | Backend/frontend/gateway Up, PostgreSQL healthy, migrate Exited(0); health/live, health/ready và OpenAPI HTTP200 |
| Migration ban đầu rồi migration integrity trên DB hiện có | Đã áp dụng thành công, seed chạy lại không reset dữ liệu |
| UI browser: đăng nhập admin, sơ đồ bàn, menu, thêm món vào giỏ | Đạt ở kiểm tra thao tác trực tiếp |
| UI responsive: desktop, mobile390px, tablet768px | Đã xem ảnh; không tràn ngang document ở hai viewport nhỏ, nav mobile có vùng cuộn riêng |

[Ảnh desktop](desktop-menu.png) · [Ảnh mobile](mobile-menu.png) · [Ảnh tablet](tablet-menu.png).

Smoke tạo dữ liệu demo có thanh toán/hủy và tăng version một số tài nguyên. Các lần sửa lỗi ban đầu có thể để lại lượt trống, có thể hủy bằng UI với lý do; không tự xóa dữ liệu vì có thể người dùng đang thử cùng lúc.

Chưa chạy: benchmark50 thiết bị, UAT5 người, bộ race/concurrency stress đầy đủ, restore drill. Chưa tuyên bố mọi QC ở SSOT đã pass. [Giới hạn triển khai](../../ADR/0008-mvp-local-va-quyet-dinh-trien-khai.md).

## QR cố định — cập nhật03/11/2026

| Kiểm tra mới | Kết quả |
|---|---|
| HTTP QR: đọc lặp không đổi mã, join không mã, hai thiết bị cùng đơn, cookie lặp giữ phiên, sai bàn, đóng/mở lại, thay QR, inactive | 72 kiểm tra đạt — [qr-result.json](qr-result.json) |
| Hồi quy toàn luồng đặt món/duyệt/bếp/serve/CASH/BANK_TRANSFER/ZERO | 131 kiểm tra đạt ở lần chạy mới — [smoke-result.json](smoke-result.json); số request phụ thuộc có cần đổi availability tạm khi test không |
| Unit backend sau thay đổi entity/migration | 13/13 đạt trong Docker |
| Unit frontend copy đúng full URL, clipboard bị từ chối, clipboard không tồn tại | 3/3 đạt, `docker build --target tests -t restaurant-ordering-frontend-tests ./Frontend` |
| Giải mã PNG320×320 lấy từ UI thật | Khớp chính xác URL hiển thị — [qr-image-result.json](qr-image-result.json) |
| Recreate backend/frontend, chạy lại migration/seed rồi đọc QR | Token/URL bàn B30 không đổi — [qr-persistence-result.json](qr-persistence-result.json) |
| UI mở QR, ảnh/link/input cùng URL, tải PNG | Đã xem trực tiếp — [hộp thoại QR](fixed-table-qr-dialog.png) |
| UI mở lượt B30 rồi mở link QR vào menu khách không hỏi mã | Đạt — [menu khách](fixed-qr-guest-menu.png); lượt trống tạo để thử đã được hủy riêng, không tác động bàn khác |

Trong IAB, nút copy báo thành công từ navigator.clipboard, nhưng virtual clipboard của công cụ browser trả rỗng khi đọc/dán nên không ghi nhận OS clipboard E2E là đạt. Logic gửi đúng toàn URL và fallback Ctrl+C được kiểm bằng3 unit test; input/link/ảnh được đối chiếu và PNG giải mã thật. Đây là giới hạn của kiểm chứng automation, không bỏ qua fallback thủ công.

Môi trường helper giải mã ảnh: node24 container tạm, jsqr1.4.0 + pngjs7.0.0; script `scripts/check-qr-image.cjs`. Không xóa image Docker, không dùng prune hoặc reset volume. Mã token trong JSON log HTTP được che; ảnh QR là dữ liệu demo localhost có chủ đích theo yêu cầu tính năng.

## Lịch sử thanh toán — 03/11/2026

| Kiểm tra | Kết quả |
|---|---|
| Backend unit trong Docker (`buildx build --target tests --output=type=cacheonly ./Backend`) | 25/25 đạt, gồm 12 ca filter/ngày UTC+07/validation/escape |
| Frontend unit trong Docker | 5/5 đạt, gồm 2 ca thời gian qua ranh ngày UTC+07 và giá trị không hợp lệ |
| Smoke riêng lịch sử | [88 HTTP checks đạt](payment-history-result.json): ADMIN-only, toàn bộ 4 đợt, receiver/time, retry, tìm kiếm/lọc/phân trang, snapshot sau đổi hồ sơ/menu |
| Hồi quy đặt món đến CASH/BANK_TRANSFER/ZERO | [131 HTTP checks đạt](smoke-result.json) |
| Production frontend/backend | Compose build chạy thành công |
| Giao diện admin | Tìm chính xác username có `_`, xem snapshot tên cũ sau khi đổi/khóa hồ sơ; chi tiết đủ 4 đợt và ghi chú; [danh sách](payment-history.png), [chi tiết](payment-history-detail.png) |

Bằng chứng và ảnh chụp được tạo trước khi dọn dữ liệu dev theo yêu cầu chủ dự án. Sau dọn, các ID trong kết quả có thể không còn tồn tại. Chạy lại smoke sẽ tạo dữ liệu mới. Chưa kiểm chứng load lớn, concurrency stress hoặc UAT nhiều người; không suy các mục đó đạt từ unit/smoke.

### Dọn dữ liệu local theo yêu cầu chủ dự án

Đã dọn trong một transaction: payments, order_items, order_batches, orders, guest_sessions, visits, audit_events, idempotency_records và 3 món riêng của smoke lịch sử (`HIST-*`). Không đưa thao tác này vào migration hoặc startup. Giữ nguyên 9 tài khoản, mật khẩu, trạng thái và 9 phân quyền; so sánh toàn bộ dữ liệu staff/roles/user_roles trước và sau ngay trong transaction, khác biệt sẽ rollback. Giữ menu/cấu hình bàn và QR cố định để tiếp tục phát triển thuận tiện; không xóa volume hoặc Docker images.

Kiểm tra sau dọn: orders=0, payments=0, visits=0; đăng nhập admin thành công, API staff vẫn trả 9 tài khoản và API lịch sử trả 0 kết quả. [Giao diện sau dọn](payment-history-after-reset.png). Các tài khoản thử được giữ nguyên cùng các tài khoản còn lại theo yêu cầu bảo toàn account.

## Từ điển database và migration — 03/11/2026

- Export metadata catalog bằng transaction READ ONLY trên đúng Compose project `restaurant_ordering`, file `compose.yml` được chỉ định rõ. Không đọc dòng tài khoản/đơn; không chạy migrate, seed, smoke, hoặc lệnh xóa dữ liệu/image/volume.
- Đối chiếu 4 MigrationId với source: đủ 16 bảng (15 ứng dụng + EF), 144 trường và 10 trigger functions. `python scripts/generate_db_docs.py --check` đạt.
- Kiểm tra guard bằng dữ liệu mô phỏng trong bộ nhớ: thiếu giải thích cột mới bị từ chối; fingerprint backend lệch làm check báo lỗi. Không sửa DB/file nguồn để thử lỗi.
- Kiểm liên kết local trong các Markdown thay đổi: đạt. `git diff --check` đạt.
- Không đổi mã ứng dụng/schema/migration; không chạy lại unit/HTTP tạo dữ liệu cho thay đổi tài liệu này. [Tài liệu DB](../db/README.md) · [Quyết định đồng bộ](../../ADR/0011-dong-bo-tai-lieu-database.md).

## Khóa 1 phiên khách QR mỗi lượt OPEN — 18/11/2026

| Kiểm tra | Kết quả |
|---|---|
| Migration `202611180005_SingleActiveGuestPerVisit` trên DB thật | Áp dụng thành công, tạo partial unique index `ux_guest_sessions_active_visit` |
| HTTP QR với khóa 1 phiên khách/lượt (`scripts/qr_smoke.py`) | Đạt — [qr-result.json](qr-result.json): chặn thiết bị thứ 2 (`409`), cho phép quét lại sau khi khách bấm Thoát hoặc nhân viên gọi `POST /tables/{id}/qr/unlock` |
| Backend build (`dotnet build`) & API docs (`generate_api_docs.py`) | Đạt (`0` warnings/errors), đồng bộ 56 endpoints |
| Frontend `tsc --noEmit`, unit tests, `next build` | Đạt (7/7 unit tests, 14/14 routes) |

## UI trang thanh toán theo Figma — 19/11/2026

| Kiểm tra | Kết quả |
|---|---|
| Đối chiếu Figma `BN / 08 / Thanh toán / desktop` node `115:4412` | Đạt: danh sách chờ bên trái, selected edge, chi tiết món/tổng tiền/note/CTA bên phải dùng đúng token hiện có |
| Production frontend build + TypeScript | Đạt, 14/14 routes được build |
| Frontend unit trong Docker | 7/7 đạt |
| Desktop 1440×900 | Đã render bằng dữ liệu local thật; chọn mặc định đơn đầu, không tràn ngang — [ảnh desktop](payment-page-figma-desktop.png) |
| Mobile 390×844 | Hai cột chuyển thành một cột, không tràn ngang — [ảnh mobile](payment-page-figma-mobile.png) |
| Chọn đơn khác | Đạt: selected card và metadata chi tiết cùng chuyển sang đơn được chọn |
| Mở luồng xác nhận | Đạt: CTA mở form hiện hữu với `CASH`/`BANK_TRANSFER`; không submit, không tạo payment hay thay đổi dữ liệu |

Kiểm tra chỉ đọc dữ liệu chờ thanh toán đang có. Không chạy migration/seed/smoke, không xác nhận thanh toán và không thay đổi API, payload, expectedVersion, idempotency hoặc transaction backend.

## UI lịch sử thanh toán theo Figma — 19/11/2026

| Kiểm tra | Kết quả |
|---|---|
| Đối chiếu Figma `BN / 09 / Lịch sử thanh toán / desktop` node `115:4599` | Đạt: 3 metric cards, search bar và bảng 5 cột dùng đúng token/kích thước/bố cục chính |
| Production frontend build + TypeScript | Đạt, 14/14 routes được build |
| Desktop 1440×900 | Render bằng dữ liệu local thật, 5 cột, không tràn ngang — [ảnh desktop](payment-history-figma-desktop.png) |
| Mobile 390×844 | Metric cards xếp một cột, document không tràn ngang; bảng có vùng cuộn riêng — [ảnh mobile](payment-history-figma-mobile.png) |
| Bộ lọc nâng cao | Đạt: giữ đủ 2 trường ngày, phương thức, loại đơn, người nhận, apply/clear; panel đóng mặc định |
| Chi tiết thanh toán | Đạt: bấm hàng mở modal chỉ đọc hiện hữu; không gửi mutation |

Kiểm tra chỉ đọc lịch sử hiện có. Không chạy migration/seed/smoke, không tạo payment và không thay đổi route, query, phân trang hoặc payload API.
