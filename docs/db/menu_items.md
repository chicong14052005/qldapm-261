# `menu_items` — Món trong thực đơn

Đối chiếu schema: `202611180005_SingleActiveGuestPerVisit` · review 03/11/2026. [Danh mục DB](README.md) · [ADR-0003](../../ADR/0003-database.md).

## 1. Vai trò và phạm vi

Danh mục món và giá bán hiện tại. Khi gọi món, tên/mã/giá được sao chép sang order_items để lịch sử không đổi khi menu thay đổi.

Quy tắc nghiệp vụ: [P1.2](../../SSOT/P1.2-thuc-don-va-tinh-trang-mon.md), [P1.4](../../SSOT/P1.4-dat-mon-va-dieu-chinh-don.md).

## 2. Các trường

Kiểu, NULL và DEFAULT dưới đây là **định nghĩa tại PostgreSQL**, không phải giá trị mặc định của C#. “Không có” nghĩa là DB không tự cấp giá trị; backend có thể cấp khi tạo entity. PK/UQ/FK/CHECK được ghi đầy đủ ở mục 3.

| Trường | Kiểu PostgreSQL | Cho NULL | DEFAULT tại DB | Ý nghĩa và cách sử dụng |
|---|---|---|---|---|
| `id` | `uuid` | Không | Không có | Định danh UUID của bản ghi, khóa chính. Ứng dụng sinh Guid.NewGuid(); seed có thể dùng UUID cố định. Không có DEFAULT UUID tại DB. |
| `created_at` | `timestamp with time zone` | Không | `now()` | Thời điểm tạo bản ghi. Entity khởi tạo UTC; các bảng Mutable còn có DEFAULT now() tại DB từ migration002. Không dùng làm thời điểm thanh toán hoặc phục vụ. |
| `updated_at` | `timestamp with time zone` | Không | `now()` | Thời điểm cập nhật gần nhất. Backend gọi Touch(); CHECK yêu cầu không trước created_at. Trigger không tự gán now(), nên writer phải cấp thời điểm đúng. |
| `version` | `bigint` | Không | `1` | Phiên bản optimistic concurrency, ban đầu 1. API so expectedVersion; trigger DB yêu cầu mỗi UPDATE tăng chính xác 1. Không phải số phiên bản migration. |
| `category_id` | `uuid` | Không | Không có | Nhóm sở hữu món, FK RESTRICT đến menu_categories.id; một món thuộc một nhóm. |
| `code` | `character varying(32)` | Không | Không có | Mã món duy nhất, viết hoa/trim/không rỗng; ví dụ MON-006. Snapshot mã món được giữ trong dòng order. |
| `name` | `character varying(160)` | Không | Không có | Tên món hiện tại, không trắng, tối đa 160 ký tự. |
| `description` | `character varying(2000)` | Không | Không có | Mô tả món, không trắng, tối đa 2000 ký tự; không dùng lưu ghi chú riêng của khách. |
| `image_url` | `character varying(2048)` | Không | Không có | Đường dẫn ảnh món, tối đa 2048 ký tự và không trắng. Entity mặc định /menu/placeholder.svg; DB không DEFAULT. |
| `price_vnd` | `bigint` | Không | Không có | Đơn giá hiện tại theo VND nguyên, từ 0 đến 10^12. Không dùng float và không nhân số lượng ở cột này. |
| `is_active` | `boolean` | Không | Không có | Cho phép món tham gia menu đang bán. Entity mặc định true; DB không DEFAULT. |
| `is_available` | `boolean` | Không | Không có | Còn món tạm thời. Entity mặc định true; món hết vẫn có thể xuất hiện trên menu nhưng không được gọi mới. DB không DEFAULT. |

## 3. Khóa, quan hệ và ràng buộc tại DB

Các định nghĩa sau lấy từ PostgreSQL catalog sau khi áp dụng đủ chuỗi migration đã ghi ở đầu file. FK `RESTRICT` ngăn xóa bản ghi đang được tham chiếu; không có cascade xóa nghiệp vụ. CHECK không thay cho phân quyền và validation ở service.

Tham chiếu tới: [menu_categories](menu_categories.md).

Được tham chiếu bởi: [order_items](order_items.md).

### `ck_menu_items_timestamps`

```sql
CHECK (updated_at >= created_at)
```

### `menu_items_category_id_fkey`

```sql
FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE RESTRICT
```

### `menu_items_code_check`

```sql
CHECK (code::text = upper(btrim(code::text)) AND code::text <> ''::text)
```

### `menu_items_code_key`

```sql
UNIQUE (code)
```

### `menu_items_description_check`

```sql
CHECK (btrim(description::text) <> ''::text)
```

### `menu_items_image_url_check`

```sql
CHECK (btrim(image_url::text) <> ''::text)
```

### `menu_items_name_check`

```sql
CHECK (btrim(name::text) <> ''::text)
```

### `menu_items_pkey`

```sql
PRIMARY KEY (id)
```

### `menu_items_price_vnd_check`

```sql
CHECK (price_vnd >= 0 AND price_vnd <= '1000000000000'::bigint)
```

### `menu_items_version_check`

```sql
CHECK (version > 0)
```

## 4. Index và đường truy vấn

Danh sách gồm cả index tự sinh bởi PRIMARY KEY/UNIQUE; không tạo thêm bản trùng. Partial index chỉ áp dụng các dòng khớp WHERE.

```sql
CREATE INDEX ix_menu_category ON public.menu_items USING btree (category_id);
```

```sql
CREATE UNIQUE INDEX menu_items_code_key ON public.menu_items USING btree (code);
```

```sql
CREATE UNIQUE INDEX menu_items_pkey ON public.menu_items USING btree (id);
```

## 5. Trigger và quy tắc liên bảng

```sql
CREATE TRIGGER version_guard BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION check_version();
```

Phần thân và giải thích từng hàm trigger: [TRIGGERS.md](TRIGGERS.md). Trigger `business_integrity` là deferred constraint trigger, kiểm tại commit; không thể suy chỉ từ một INSERT riêng lẻ.

## 6. Vòng đời, lưu ý và giới hạn

- Manager/admin quản lý món; bếp/manager/admin đổi còn/hết theo policy. Không hard-delete món trong API hiện tại.
- is_active là ẩn/ngừng bán; is_available là còn/hết tạm thời. Cần cả món và nhóm hợp lệ khi gửi đợt mới.
- DB chỉ kiểm image_url không trắng/độ dài; quy tắc đường dẫn /menu/ hoặc HTTPS được backend kiểm. Giá đơn cũ không đọc lại từ price_vnd.

## 7. Cập nhật tài liệu

File được sinh từ catalog metadata và phần giải thích đã review trong `scripts/db_doc_catalog.py`. Khi đổi schema/logic liên quan: thêm migration mới nếu cần, cập nhật catalog giải thích, SSOT và ADR cùng thay đổi; export metadata chỉ đọc rồi sinh lại. Chạy `python scripts/generate_db_docs.py --check` trước commit. Xem [quy trình đồng bộ](README.md#quy-trình-đồng-bộ-bắt-buộc).
