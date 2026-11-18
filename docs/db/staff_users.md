# `staff_users` — Tài khoản nhân viên

Đối chiếu schema: `202611180005_SingleActiveGuestPerVisit` · review 03/11/2026. [Danh mục DB](README.md) · [ADR-0003](../../ADR/0003-database.md).

## 1. Vai trò và phạm vi

Lưu danh tính đăng nhập nội bộ, mật khẩu đã hash và trạng thái tài khoản. Một nhân viên có thể có nhiều role qua user_roles; khách quét QR không tạo tài khoản tại đây.

Quy tắc nghiệp vụ: [P1.1](../../SSOT/P1.1-tai-khoan-va-phan-quyen.md).

## 2. Các trường

Kiểu, NULL và DEFAULT dưới đây là **định nghĩa tại PostgreSQL**, không phải giá trị mặc định của C#. “Không có” nghĩa là DB không tự cấp giá trị; backend có thể cấp khi tạo entity. PK/UQ/FK/CHECK được ghi đầy đủ ở mục 3.

| Trường | Kiểu PostgreSQL | Cho NULL | DEFAULT tại DB | Ý nghĩa và cách sử dụng |
|---|---|---|---|---|
| `id` | `uuid` | Không | Không có | Định danh UUID của bản ghi, khóa chính. Ứng dụng sinh Guid.NewGuid(); seed có thể dùng UUID cố định. Không có DEFAULT UUID tại DB. |
| `created_at` | `timestamp with time zone` | Không | `now()` | Thời điểm tạo bản ghi. Entity khởi tạo UTC; các bảng Mutable còn có DEFAULT now() tại DB từ migration002. Không dùng làm thời điểm thanh toán hoặc phục vụ. |
| `updated_at` | `timestamp with time zone` | Không | `now()` | Thời điểm cập nhật gần nhất. Backend gọi Touch(); CHECK yêu cầu không trước created_at. Trigger không tự gán now(), nên writer phải cấp thời điểm đúng. |
| `version` | `bigint` | Không | `1` | Phiên bản optimistic concurrency, ban đầu 1. API so expectedVersion; trigger DB yêu cầu mỗi UPDATE tăng chính xác 1. Không phải số phiên bản migration. |
| `username` | `character varying(64)` | Không | Không có | Tên đăng nhập đã trim/lowercase ở backend, duy nhất. DB chấp nhận 3–64 ký tự a-z, 0-9, dấu chấm/gạch dưới/gạch ngang; không lưu email thay username. |
| `display_name` | `character varying(120)` | Không | Không có | Tên hiển thị nhân viên, không trắng. Có thể đổi; các màn hình hồ sơ dùng tên hiện tại, payment dùng snapshot tại lúc nhận tiền. |
| `password_hash` | `text` | Không | Không có | Chuỗi hash có định dạng của ASP.NET Core Identity PasswordHasher. Không lưu mật khẩu rõ và không giải mã; DB chỉ yêu cầu NOT NULL, không kiểm thuật toán hash. |
| `is_active` | `boolean` | Không | Không có | Có cho tài khoản tiếp tục xác thực hay không. Entity mặc định true; DB không có DEFAULT. Backend kiểm mỗi request và thu hồi phiên khi khóa. |
| `must_change_password` | `boolean` | Không | Không có | Bắt buộc đổi mật khẩu tạm trước khi dùng nghiệp vụ. Entity mặc định true; seed demo đặt false. DB không có DEFAULT. |

## 3. Khóa, quan hệ và ràng buộc tại DB

Các định nghĩa sau lấy từ PostgreSQL catalog sau khi áp dụng đủ chuỗi migration đã ghi ở đầu file. FK `RESTRICT` ngăn xóa bản ghi đang được tham chiếu; không có cascade xóa nghiệp vụ. CHECK không thay cho phân quyền và validation ở service.

Được tham chiếu bởi: [audit_events](audit_events.md), [idempotency_records](idempotency_records.md), [order_batches](order_batches.md), [orders](orders.md), [payments](payments.md), [staff_sessions](staff_sessions.md), [user_roles](user_roles.md), [visits](visits.md).

### `ck_staff_users_timestamps`

```sql
CHECK (updated_at >= created_at)
```

### `staff_users_display_name_check`

```sql
CHECK (btrim(display_name::text) <> ''::text)
```

### `staff_users_pkey`

```sql
PRIMARY KEY (id)
```

### `staff_users_username_check`

```sql
CHECK (username::text ~ '^[a-z0-9._-]{3,64}$'::text)
```

### `staff_users_username_key`

```sql
UNIQUE (username)
```

### `staff_users_version_check`

```sql
CHECK (version > 0)
```

## 4. Index và đường truy vấn

Danh sách gồm cả index tự sinh bởi PRIMARY KEY/UNIQUE; không tạo thêm bản trùng. Partial index chỉ áp dụng các dòng khớp WHERE.

```sql
CREATE UNIQUE INDEX staff_users_pkey ON public.staff_users USING btree (id);
```

```sql
CREATE UNIQUE INDEX staff_users_username_key ON public.staff_users USING btree (username);
```

## 5. Trigger và quy tắc liên bảng

```sql
CREATE TRIGGER version_guard BEFORE UPDATE ON staff_users FOR EACH ROW EXECUTE FUNCTION check_version();
```

Phần thân và giải thích từng hàm trigger: [TRIGGERS.md](TRIGGERS.md). Trigger `business_integrity` là deferred constraint trigger, kiểm tại commit; không thể suy chỉ từ một INSERT riêng lẻ.

## 6. Vòng đời, lưu ý và giới hạn

- Admin tạo/sửa/khóa tài khoản; không có API hard-delete. Đổi mật khẩu, role hoặc khóa sẽ thu hồi phiên qua backend.
- Bảo vệ ADMIN cuối cùng và kiểm độ mạnh mật khẩu nằm ở service, không phải CHECK của bảng. Không đưa password_hash vào API hoặc log.
- Khóa hoặc đổi tên nhân viên không thay snapshot người thu tại payments.

## 7. Cập nhật tài liệu

File được sinh từ catalog metadata và phần giải thích đã review trong `scripts/db_doc_catalog.py`. Khi đổi schema/logic liên quan: thêm migration mới nếu cần, cập nhật catalog giải thích, SSOT và ADR cùng thay đổi; export metadata chỉ đọc rồi sinh lại. Chạy `python scripts/generate_db_docs.py --check` trước commit. Xem [quy trình đồng bộ](README.md#quy-trình-đồng-bộ-bắt-buộc).
