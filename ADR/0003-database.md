# ADR-0003 — PostgreSQL và cấu trúc dữ liệu hiện hành

03/11/2026 (cập nhật 18/11/2026) · Đã triển khai đến migration005. Bản cập nhật này thay từ điển thiết kế ban đầu bằng mô tả đã đối chiếu code/catalog; không thay yêu cầu nghiệp vụ trong [SSOT](../SSOT/README.md).

## 1. Quyết định và nguồn dữ liệu

PostgreSQL 16, EF Core/Npgsql 10; modular monolith dùng một database. Schema thực thi đến từ chuỗi **EF SQL-first migrations**, không từ EF ModelSnapshot hoặc `EnsureCreated()`. File `schema.sql` chỉ là SQL đầu vào cho migration001, không phải schema mới nhất để chạy lại trên DB hiện tại.

**Từ điển trường hiện hành nằm tại [docs/db](../docs/db/README.md), mỗi bảng một file.** Các file đó liệt kê chính xác kiểu/NULL/DEFAULT tại DB, constraint/index/trigger và ý nghĩa từng trường. ADR này giữ quyết định cấu trúc và lý do; không lặp lại một bảng từ điển thứ hai dễ lệch. Bản baseline trước đây có DEFAULT/constraint dự kiến chưa được implement; các cam kết hiện hành phải đọc ở docs/db và các giới hạn dưới đây.

Nguồn kiểm chứng: [schema.sql](../Backend/Restaurant.Api/Data/schema.sql), migration001–004, [Entities.cs](../Backend/Restaurant.Api/Domain/Entities.cs), [AppDb.cs](../Backend/Restaurant.Api/Data/AppDb.cs) và service backend; catalog PostgreSQL chỉ đọc lưu ở [schema-metadata.json](../docs/db/schema-metadata.json).

## 2. Các nhóm bảng

| Nhóm | Bảng và tài liệu | Lý do tách |
|---|---|---|
| Nhân viên | [staff_users](../docs/db/staff_users.md), [roles](../docs/db/roles.md), [user_roles](../docs/db/user_roles.md), [staff_sessions](../docs/db/staff_sessions.md) | Một user nhiều role; phiên thu hồi được, không lưu quyền cố định trong cookie |
| Menu | [menu_categories](../docs/db/menu_categories.md), [menu_items](../docs/db/menu_items.md) | Danh mục/giá hiện tại tách dữ liệu đơn đã gọi |
| Bàn/khách | [restaurant_tables](../docs/db/restaurant_tables.md), [visits](../docs/db/visits.md), [guest_sessions](../docs/db/guest_sessions.md) | Bàn cố định có nhiều lượt; mỗi phiên khách chỉ có quyền đúng lượt |
| Đặt món/bếp/phục vụ | [orders](../docs/db/orders.md), [order_batches](../docs/db/order_batches.md), [order_items](../docs/db/order_items.md) | Tách vòng đời đơn, quyết định từng đợt gọi thêm và tiến độ từng món |
| Thanh toán | [payments](../docs/db/payments.md) | Một lần thu toàn bộ đơn; snapshot người thu và thời điểm |
| Hạ tầng | [audit_events](../docs/db/audit_events.md), [idempotency_records](../docs/db/idempotency_records.md) | Nhật ký hành động khác với chống thực hiện lại command |
| EF | [__EFMigrationsHistory](../docs/db/__EFMigrationsHistory.md) | Phiên bản schema đã áp dụng, không phải nghiệp vụ |

Tổng **15 bảng ứng dụng và 1 bảng EF**. [ERD](../docs/db/README.md#quan-hệ-chính) mô tả đường quan hệ chính; từng file liệt kê đầy đủ FK.

## 3. Kiểu, thời gian và giá trị mặc định

- UUID do ứng dụng sinh; seed có một số ID ổn định. Không có DEFAULT `gen_random_uuid()` tại DB.
- Tiền là `bigint` VND nguyên, mỗi trường tiền giới hạn 0..10^12; quantity 1..99. Tổng tính bằng numeric trong deferred SQL trước kiểm giới hạn; không dùng float hoặc lưu tiền thừa/thành tiền trùng.
- Thời gian dùng `timestamptz`, lưu thời điểm, không lưu tên múi giờ gốc. Entity/server thường cấp UTC. UI/bộ lọc lịch sử thanh toán dùng UTC+07. Payment sinh millisecond để phản hồi/replay/đọc lại giống nhau.
- Tám bảng Mutable: staff_users, menu_categories, menu_items, restaurant_tables, visits, orders, order_batches, order_items. Chúng có `created_at/updated_at DEFAULT now()`, `version DEFAULT 1`, version>0 và updated_at>=created_at. `Touch()` ở backend tăng version/cập nhật thời điểm; trigger DB **chỉ kiểm**, không tự gán thời điểm.
- Bảng không Mutable không tự có nhóm cột trên. Đặc biệt `payments.paid_at`, thời điểm phiên/audit/idempotency không có DEFAULT SQL; entity/service cấp giá trị.
- Boolean active/must-change, status và nhiều giá trị có C# initializer **không có DEFAULT tại DB**. Không mô tả initializer như DEFAULT SQL.
- DB CHECK canonical/nonblank chỉ áp dụng các trường được liệt kê trong từng bảng. Ví dụ role.display_name, order.code/pickup_code không có CHECK nonblank riêng; backend validation/mã sinh bổ sung chính sách. Không khẳng định mọi chuỗi NOT NULL đều đã có CHECK trim.

## 4. Tính nhất quán đã thực hiện

| Quy tắc | Cơ chế thực tế |
|---|---|
| Một lượt OPEN/bàn | Partial unique index visits(table_id) WHERE status='OPEN' |
| Tối đa một phiên khách hoạt động/lượt | Partial unique index `ux_guest_sessions_active_visit` trên `guest_sessions(visit_id) WHERE revoked_at IS NULL` (migration005) + khóa visit trong `Join` |
| Một order/visit và một payment/order | UNIQUE + FK; deferred trigger đòi mỗi visit có order và mỗi PAID có payment |
| Guest không lẫn lượt | Auth kiểm visit OPEN/session; guard_batch kiểm guest session thuộc visit của order |
| Đợt đầu tự duyệt, đợt thêm có quyết định | CHECK hình dạng reviewer/time/reason; guard_batch chặn sửa quyết định cuối và tự duyệt sai role |
| Batch có 1–50 dòng và trạng thái phù hợp | Deferred `check_business_integrity()` tại commit |
| Món có snapshot bất biến và chuyển trạng thái hợp lệ | `check_item_transition()` trước UPDATE; service kiểm role/lý do và expectedVersion |
| Chốt đúng tổng, không còn món chưa xong | Deferred trigger so tổng SERVED, không còn PENDING/unfinished, payment khớp order |
| Payment/audit append-only | Trigger chặn UPDATE/DELETE; service không có API sửa/xóa |
| Giữ đầy đủ dòng/đợt của PAID | UPDATE item bị chặn vì order không SERVING, batch quyết định cuối bất biến; migration004 chặn DELETE item/batch của PAID |
| Lưu người nhận tiền đúng lúc | Snapshot ID/username/tên từ actor; SELECT FOR SHARE và trigger INSERT đối chiếu hồ sơ |
| Retry không tạo lần hai | Advisory transaction lock actor/key, partial UNIQUE actor/key, fingerprint request và replay ciphertext |

Phần thân từng hàm ở [TRIGGERS.md](../docs/db/TRIGGERS.md). Trigger deferred chỉ có ý nghĩa khi xét transaction hoàn chỉnh; transaction tạo order/visit/payment có thể đi qua trạng thái tạm trước commit.

Backend khóa bàn/lượt trước order ở đơn tại bàn, rồi sửa batch/item và danh mục cần thiết; mutation cùng order được tuần tự hóa bằng row lock. Khóa code cụ thể ở `ApiService.OrderLock`, `Ordering`, `MenuAndVisits`, `Billing`; không tuyên bố đã kiểm chứng mọi deadlock/race bằng stress test.

## 5. Snapshot, QR và dữ liệu không lưu trùng

Snapshot mã bàn ở visits; mã/tên/đơn giá món ở order_items; người nhận tiền ở payments. Đổi menu/tên nhân viên/bàn hiện tại không thay dữ liệu lịch sử đã lưu. Không đọc lại giá menu hiện tại để dựng biên nhận.

QR bàn cố định dùng hash để tìm bàn và ciphertext Data Protection để dựng lại đúng URL. Migration003 loại bỏ join_code_hmac và join_generation của visit/guest; không còn quy tắc nhập mã. [ADR-0009](0009-qr-co-dinh-tai-ban.md) và SSOT P1.3 là quyết định/feature hiện hành.

Không thêm table_id trong orders vì suy ra từ visit; takeaway có visit_id NULL. Không thêm invoice/line clone, line_total, tổng tạm hoặc change_vnd vì đã có order/item/payment bất biến hoặc có thể tính trực tiếp. Không có customer account, kho, voucher, VAT tách riêng, thanh toán gateway, Redis hoặc outbox trong scope MVP.

Payment snapshot nullable chỉ tương thích dữ liệu dev cũ, không backfill giả. INSERT mới bắt buộc đầy đủ bằng trigger. [ADR-0010](0010-lich-su-thanh-toan-admin.md) ghi lịch sử thanh toán admin và phân trang, bộ lọc, index đã thêm.

## 6. Những bảo đảm chưa có

- Migration/API local đang dùng cùng user PostgreSQL; chưa tách role DDL/DML. Trigger không chống PostgreSQL superuser hay mọi thao tác SQL quản trị.
- ADMIN cuối cùng, quyền endpoint, độ mạnh mật khẩu, URL ảnh và lý do theo action do backend kiểm; không có đầy đủ DB CHECK cho mọi quy tắc đó.
- Audit target_id là UUID đa hình không FK; writer phải đúng. DB không tự buộc mọi mutation phải có audit và không có distributed tracing correlation riêng.
- Không có cơ chế soft-delete chung hoặc cleanup/retention job tự động cho phiên/idempotency. Phiên bị thu hồi không mặc định bị xóa; việc hết hạn replay không cho tái dùng key cũ.
- Index thật được liệt kê ở từng bảng, gồm PK/UQ. Không mô tả index dự kiến như đã tạo. Index FK migration002 không dùng WHERE partial; migration004 bổ sung composite indexes lịch sử và vẫn giữ index thời gian cũ.
- Các list vận hành còn giới hạn bản MVP; lịch sử ADMIN có phân trang riêng. Không khẳng định mọi queue đã dùng cursor/paging hoặc đã có EXPLAIN/load/concurrency/restore drill.

## 7. Migration, tài liệu và thay đổi

Chuỗi hiện tại: 001 InitialSchema → 002 IntegrityGuards → 003 FixedTableQr → 004 PaymentRecipientHistory → 005 SingleActiveGuestPerVisit. EF dùng `__EFMigrationsHistory`; các bản đã chạy không được sửa. `Down()` hiện throw, chưa hỗ trợ rollback tự động. [ADR-0004](0004-docker-va-migration.md) và [GUIDE](../GUIDE/DATABASE-MIGRATIONS.md) mô tả quy trình thực tế.

Khi code/schema đổi: cập nhật đúng SSOT, ADR liên quan, metadata và giải thích bảng trong cùng commit; chạy `python scripts/generate_db_docs.py --check`. [ADR-0011](0011-dong-bo-tai-lieu-database.md) quy định bộ tài liệu và kiểm tra stale. Fingerprint giúp báo nguồn backend đổi, không tự chứng minh ngữ nghĩa tài liệu.

Lần cập nhật tài liệu này chỉ đọc catalog bằng transaction READ ONLY và xử lý file local; không chạy migration/seed, không xóa dữ liệu, volume hay Docker images. Việc dọn dev của nhiệm vụ trước không thành chính sách reset hoặc quyền xóa mặc định.
