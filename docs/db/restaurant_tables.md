# `restaurant_tables` — Bàn và QR cố định

Đối chiếu schema: `202611180005_SingleActiveGuestPerVisit` · review 03/11/2026. [Danh mục DB](README.md) · [ADR-0003](../../ADR/0003-database.md).

## 1. Vai trò và phạm vi

Thông tin bàn vật lý và token QR cố định. Một bàn có nhiều lượt khách theo thời gian; lượt hiện tại ở visits, không lưu trạng thái bận trùng tại bảng này.

Quy tắc nghiệp vụ: [P1.3](../../SSOT/P1.3-ban-va-luot-khach.md).

## 2. Các trường

Kiểu, NULL và DEFAULT dưới đây là **định nghĩa tại PostgreSQL**, không phải giá trị mặc định của C#. “Không có” nghĩa là DB không tự cấp giá trị; backend có thể cấp khi tạo entity. PK/UQ/FK/CHECK được ghi đầy đủ ở mục 3.

| Trường | Kiểu PostgreSQL | Cho NULL | DEFAULT tại DB | Ý nghĩa và cách sử dụng |
|---|---|---|---|---|
| `id` | `uuid` | Không | Không có | Định danh UUID của bản ghi, khóa chính. Ứng dụng sinh Guid.NewGuid(); seed có thể dùng UUID cố định. Không có DEFAULT UUID tại DB. |
| `created_at` | `timestamp with time zone` | Không | `now()` | Thời điểm tạo bản ghi. Entity khởi tạo UTC; các bảng Mutable còn có DEFAULT now() tại DB từ migration002. Không dùng làm thời điểm thanh toán hoặc phục vụ. |
| `updated_at` | `timestamp with time zone` | Không | `now()` | Thời điểm cập nhật gần nhất. Backend gọi Touch(); CHECK yêu cầu không trước created_at. Trigger không tự gán now(), nên writer phải cấp thời điểm đúng. |
| `version` | `bigint` | Không | `1` | Phiên bản optimistic concurrency, ban đầu 1. API so expectedVersion; trigger DB yêu cầu mỗi UPDATE tăng chính xác 1. Không phải số phiên bản migration. |
| `code` | `character varying(20)` | Không | Không có | Mã bàn duy nhất, viết hoa/trim/không rỗng; ví dụ B01. Mã tại lúc mở lượt được snapshot trong visits. |
| `capacity` | `smallint` | Không | Không có | Sức chứa số người, smallint từ 1 đến 30. Entity mặc định 4; DB không DEFAULT. Số khách lúc mở lượt không vượt sức chứa. |
| `is_active` | `boolean` | Không | Không có | Bàn có phục vụ hay tạm ngưng; entity mặc định true, DB không DEFAULT. Không phải cờ có khách. |
| `qr_token_hash` | `bytea` | Không | Không có | SHA-256 32 byte của token QR, UNIQUE, dùng xác thực link/tra bàn. Không dùng hash để dựng lại QR. |
| `qr_token_ciphertext` | `bytea` | Có | Không có | Token QR được mã hóa bằng ASP.NET Data Protection để nhân viên có thể đọc lại đúng URL. NULL cho bản ghi cũ chưa seed nâng cấp; nếu có phải không rỗng. Migration003 thêm cột; seed khởi tạo một lần, không xoay QR đã có. |

## 3. Khóa, quan hệ và ràng buộc tại DB

Các định nghĩa sau lấy từ PostgreSQL catalog sau khi áp dụng đủ chuỗi migration đã ghi ở đầu file. FK `RESTRICT` ngăn xóa bản ghi đang được tham chiếu; không có cascade xóa nghiệp vụ. CHECK không thay cho phân quyền và validation ở service.

Được tham chiếu bởi: [visits](visits.md).

### `ck_restaurant_tables_timestamps`

```sql
CHECK (updated_at >= created_at)
```

### `restaurant_tables_capacity_check`

```sql
CHECK (capacity >= 1 AND capacity <= 30)
```

### `restaurant_tables_code_check`

```sql
CHECK (code::text = upper(btrim(code::text)) AND code::text <> ''::text)
```

### `restaurant_tables_code_key`

```sql
UNIQUE (code)
```

### `restaurant_tables_pkey`

```sql
PRIMARY KEY (id)
```

### `restaurant_tables_qr_token_ciphertext_check`

```sql
CHECK (qr_token_ciphertext IS NULL OR octet_length(qr_token_ciphertext) > 0)
```

### `restaurant_tables_qr_token_hash_check`

```sql
CHECK (octet_length(qr_token_hash) = 32)
```

### `restaurant_tables_qr_token_hash_key`

```sql
UNIQUE (qr_token_hash)
```

### `restaurant_tables_version_check`

```sql
CHECK (version > 0)
```

## 4. Index và đường truy vấn

Danh sách gồm cả index tự sinh bởi PRIMARY KEY/UNIQUE; không tạo thêm bản trùng. Partial index chỉ áp dụng các dòng khớp WHERE.

```sql
CREATE UNIQUE INDEX restaurant_tables_code_key ON public.restaurant_tables USING btree (code);
```

```sql
CREATE UNIQUE INDEX restaurant_tables_pkey ON public.restaurant_tables USING btree (id);
```

```sql
CREATE UNIQUE INDEX restaurant_tables_qr_token_hash_key ON public.restaurant_tables USING btree (qr_token_hash);
```

## 5. Trigger và quy tắc liên bảng

```sql
CREATE TRIGGER table_guard BEFORE UPDATE ON restaurant_tables FOR EACH ROW EXECUTE FUNCTION guard_table();
```

```sql
CREATE TRIGGER version_guard BEFORE UPDATE ON restaurant_tables FOR EACH ROW EXECUTE FUNCTION check_version();
```

Phần thân và giải thích từng hàm trigger: [TRIGGERS.md](TRIGGERS.md). Trigger `business_integrity` là deferred constraint trigger, kiểm tại commit; không thể suy chỉ từ một INSERT riêng lẻ.

## 6. Vòng đời, lưu ý và giới hạn

- Manager/admin cấu hình bàn; waiter/manager/admin đọc QR để hiển thị ảnh/link/copy. Token QR giữ qua các lượt; chỉ rotate khi gọi lệnh riêng.
- Trigger chặn đổi code/capacity/is_active khi đang có lượt OPEN. Backend cũng kiểm điều này.
- qr_token_ciphertext cần keyring Data Protection tại /keys để giải mã lại link. Không đưa ciphertext/hash vào log; API QR được phân quyền riêng.

## 7. Cập nhật tài liệu

File được sinh từ catalog metadata và phần giải thích đã review trong `scripts/db_doc_catalog.py`. Khi đổi schema/logic liên quan: thêm migration mới nếu cần, cập nhật catalog giải thích, SSOT và ADR cùng thay đổi; export metadata chỉ đọc rồi sinh lại. Chạy `python scripts/generate_db_docs.py --check` trước commit. Xem [quy trình đồng bộ](README.md#quy-trình-đồng-bộ-bắt-buộc).
