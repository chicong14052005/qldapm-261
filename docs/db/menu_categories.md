# `menu_categories` — Nhóm thực đơn

Đối chiếu schema: `202611180005_SingleActiveGuestPerVisit` · review 03/11/2026. [Danh mục DB](README.md) · [ADR-0003](../../ADR/0003-database.md).

## 1. Vai trò và phạm vi

Nhóm món để tổ chức và sắp xếp thực đơn. Tách nhóm khỏi món để đổi tên/thứ tự nhóm mà không sửa mọi món.

Quy tắc nghiệp vụ: [P1.2](../../SSOT/P1.2-thuc-don-va-tinh-trang-mon.md).

## 2. Các trường

Kiểu, NULL và DEFAULT dưới đây là **định nghĩa tại PostgreSQL**, không phải giá trị mặc định của C#. “Không có” nghĩa là DB không tự cấp giá trị; backend có thể cấp khi tạo entity. PK/UQ/FK/CHECK được ghi đầy đủ ở mục 3.

| Trường | Kiểu PostgreSQL | Cho NULL | DEFAULT tại DB | Ý nghĩa và cách sử dụng |
|---|---|---|---|---|
| `id` | `uuid` | Không | Không có | Định danh UUID của bản ghi, khóa chính. Ứng dụng sinh Guid.NewGuid(); seed có thể dùng UUID cố định. Không có DEFAULT UUID tại DB. |
| `created_at` | `timestamp with time zone` | Không | `now()` | Thời điểm tạo bản ghi. Entity khởi tạo UTC; các bảng Mutable còn có DEFAULT now() tại DB từ migration002. Không dùng làm thời điểm thanh toán hoặc phục vụ. |
| `updated_at` | `timestamp with time zone` | Không | `now()` | Thời điểm cập nhật gần nhất. Backend gọi Touch(); CHECK yêu cầu không trước created_at. Trigger không tự gán now(), nên writer phải cấp thời điểm đúng. |
| `version` | `bigint` | Không | `1` | Phiên bản optimistic concurrency, ban đầu 1. API so expectedVersion; trigger DB yêu cầu mỗi UPDATE tăng chính xác 1. Không phải số phiên bản migration. |
| `code` | `character varying(32)` | Không | Không có | Mã nhóm duy nhất, tối đa 32 ký tự. DB yêu cầu viết hoa, trim và không rỗng; ví dụ CAT-1. |
| `name` | `character varying(100)` | Không | Không có | Tên nhóm hiển thị, ví dụ Món chính; NOT NULL, không trắng, tối đa 100 ký tự. |
| `sort_order` | `integer` | Không | Không có | Thứ tự hiển thị số nguyên không âm. Không UNIQUE: nhiều nhóm có thể cùng thứ tự; entity mặc định 0, DB không DEFAULT. |
| `is_active` | `boolean` | Không | Không có | true để nhóm được dùng/hiển thị theo policy menu. Entity mặc định true, DB không DEFAULT. |

## 3. Khóa, quan hệ và ràng buộc tại DB

Các định nghĩa sau lấy từ PostgreSQL catalog sau khi áp dụng đủ chuỗi migration đã ghi ở đầu file. FK `RESTRICT` ngăn xóa bản ghi đang được tham chiếu; không có cascade xóa nghiệp vụ. CHECK không thay cho phân quyền và validation ở service.

Được tham chiếu bởi: [menu_items](menu_items.md).

### `ck_menu_categories_timestamps`

```sql
CHECK (updated_at >= created_at)
```

### `menu_categories_code_check`

```sql
CHECK (code::text = upper(btrim(code::text)) AND code::text <> ''::text)
```

### `menu_categories_code_key`

```sql
UNIQUE (code)
```

### `menu_categories_name_check`

```sql
CHECK (btrim(name::text) <> ''::text)
```

### `menu_categories_pkey`

```sql
PRIMARY KEY (id)
```

### `menu_categories_sort_order_check`

```sql
CHECK (sort_order >= 0)
```

### `menu_categories_version_check`

```sql
CHECK (version > 0)
```

## 4. Index và đường truy vấn

Danh sách gồm cả index tự sinh bởi PRIMARY KEY/UNIQUE; không tạo thêm bản trùng. Partial index chỉ áp dụng các dòng khớp WHERE.

```sql
CREATE UNIQUE INDEX menu_categories_code_key ON public.menu_categories USING btree (code);
```

```sql
CREATE UNIQUE INDEX menu_categories_pkey ON public.menu_categories USING btree (id);
```

## 5. Trigger và quy tắc liên bảng

```sql
CREATE TRIGGER version_guard BEFORE UPDATE ON menu_categories FOR EACH ROW EXECUTE FUNCTION check_version();
```

Phần thân và giải thích từng hàm trigger: [TRIGGERS.md](TRIGGERS.md). Trigger `business_integrity` là deferred constraint trigger, kiểm tại commit; không thể suy chỉ từ một INSERT riêng lẻ.

## 6. Vòng đời, lưu ý và giới hạn

- Manager/admin tạo/sửa hoặc ẩn bằng is_active. Menu công khai chỉ lấy nhóm và món đang active; ẩn nhóm không xóa lịch sử món đã gọi.
- Backend khóa/kiểm nhóm khi sửa menu; FK ngăn xóa nhóm còn món tham chiếu.

## 7. Cập nhật tài liệu

File được sinh từ catalog metadata và phần giải thích đã review trong `scripts/db_doc_catalog.py`. Khi đổi schema/logic liên quan: thêm migration mới nếu cần, cập nhật catalog giải thích, SSOT và ADR cùng thay đổi; export metadata chỉ đọc rồi sinh lại. Chạy `python scripts/generate_db_docs.py --check` trước commit. Xem [quy trình đồng bộ](README.md#quy-trình-đồng-bộ-bắt-buộc).
