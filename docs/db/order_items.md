# `order_items` — Dòng món của đợt

Đối chiếu schema: `202611180005_SingleActiveGuestPerVisit` · review 03/11/2026. [Danh mục DB](README.md) · [ADR-0003](../../ADR/0003-database.md).

## 1. Vai trò và phạm vi

Một dòng món với số lượng, ghi chú, giá và tên snapshot; đồng thời lưu tiến độ từ chờ duyệt đến giao khách. Batch là nguồn phê duyệt; item là nguồn tiến độ từng món.

Quy tắc nghiệp vụ: [P1.4](../../SSOT/P1.4-dat-mon-va-dieu-chinh-don.md), [P1.5](../../SSOT/P1.5-xu-ly-mon-tai-bep.md), [P1.6](../../SSOT/P1.6-theo-doi-va-phuc-vu.md), [P1.7](../../SSOT/P1.7-thanh-toan-va-hoan-tat.md).

## 2. Các trường

Kiểu, NULL và DEFAULT dưới đây là **định nghĩa tại PostgreSQL**, không phải giá trị mặc định của C#. “Không có” nghĩa là DB không tự cấp giá trị; backend có thể cấp khi tạo entity. PK/UQ/FK/CHECK được ghi đầy đủ ở mục 3.

| Trường | Kiểu PostgreSQL | Cho NULL | DEFAULT tại DB | Ý nghĩa và cách sử dụng |
|---|---|---|---|---|
| `id` | `uuid` | Không | Không có | Định danh UUID của bản ghi, khóa chính. Ứng dụng sinh Guid.NewGuid(); seed có thể dùng UUID cố định. Không có DEFAULT UUID tại DB. |
| `created_at` | `timestamp with time zone` | Không | `now()` | Thời điểm tạo bản ghi. Entity khởi tạo UTC; các bảng Mutable còn có DEFAULT now() tại DB từ migration002. Không dùng làm thời điểm thanh toán hoặc phục vụ. |
| `updated_at` | `timestamp with time zone` | Không | `now()` | Thời điểm cập nhật gần nhất. Backend gọi Touch(); CHECK yêu cầu không trước created_at. Trigger không tự gán now(), nên writer phải cấp thời điểm đúng. |
| `version` | `bigint` | Không | `1` | Phiên bản optimistic concurrency, ban đầu 1. API so expectedVersion; trigger DB yêu cầu mỗi UPDATE tăng chính xác 1. Không phải số phiên bản migration. |
| `batch_id` | `uuid` | Không | Không có | Đợt sở hữu dòng món, FK RESTRICT đến order_batches.id; không đổi sau tạo. |
| `menu_item_id` | `uuid` | Không | Không có | Món gốc trong menu, FK RESTRICT. Dùng truy vết danh mục; không đọc tên/giá hiện tại thay snapshot. |
| `menu_code_snapshot` | `character varying(32)` | Không | Không có | Mã món tại lúc gửi, tối đa 32 ký tự, NOT NULL; do backend sao chép. Trigger giữ bất biến sau tạo. |
| `menu_name_snapshot` | `character varying(160)` | Không | Không có | Tên món tại lúc gửi, không trắng, tối đa 160 ký tự; giữ nguyên khi menu đổi tên. |
| `quantity` | `smallint` | Không | Không có | Số suất của dòng, smallint 1–99. Backend/trigger không cho tăng trên dòng đã gửi; giảm/sửa chỉ ở PLACED/ACCEPTED. |
| `unit_price_vnd` | `bigint` | Không | Không có | Đơn giá VND nguyên tại lúc gọi, 0..10^12, bất biến. Thành tiền suy ra quantity × giá, không lưu thêm line_total. |
| `note` | `character varying(500)` | Có | Không có | Ghi chú riêng của dòng, ví dụ Ít cay; NULL nếu không có, tối đa 500 ký tự. Chỉ sửa trước chuẩn bị theo policy. |
| `status` | `character varying(20)` | Không | Không có | PENDING_APPROVAL/PLACED/ACCEPTED/PREPARING/READY/SERVED/CANCELLED/REJECTED. Entity mặc định PLACED; backend gán PENDING_APPROVAL cho đợt thêm; DB không DEFAULT. |
| `status_changed_at` | `timestamp with time zone` | Không | Không có | Thời điểm chuyển trạng thái gần nhất, server gán UTC; sửa thông tin không nhất thiết đổi mốc này. Không có DEFAULT tại DB. |

## 3. Khóa, quan hệ và ràng buộc tại DB

Các định nghĩa sau lấy từ PostgreSQL catalog sau khi áp dụng đủ chuỗi migration đã ghi ở đầu file. FK `RESTRICT` ngăn xóa bản ghi đang được tham chiếu; không có cascade xóa nghiệp vụ. CHECK không thay cho phân quyền và validation ở service.

Tham chiếu tới: [menu_items](menu_items.md), [order_batches](order_batches.md).

### `business_integrity`

```sql
TRIGGER DEFERRABLE INITIALLY DEFERRED
```

### `ck_order_items_timestamps`

```sql
CHECK (updated_at >= created_at)
```

### `order_items_batch_id_fkey`

```sql
FOREIGN KEY (batch_id) REFERENCES order_batches(id) ON DELETE RESTRICT
```

### `order_items_menu_item_id_fkey`

```sql
FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT
```

### `order_items_menu_name_snapshot_check`

```sql
CHECK (btrim(menu_name_snapshot::text) <> ''::text)
```

### `order_items_pkey`

```sql
PRIMARY KEY (id)
```

### `order_items_quantity_check`

```sql
CHECK (quantity >= 1 AND quantity <= 99)
```

### `order_items_status_check`

```sql
CHECK (status::text = ANY (ARRAY['PENDING_APPROVAL'::character varying, 'PLACED'::character varying, 'ACCEPTED'::character varying, 'PREPARING'::character varying, 'READY'::character varying, 'SERVED'::character varying, 'CANCELLED'::character varying, 'REJECTED'::character varying]::text[]))
```

### `order_items_unit_price_vnd_check`

```sql
CHECK (unit_price_vnd >= 0 AND unit_price_vnd <= '1000000000000'::bigint)
```

### `order_items_version_check`

```sql
CHECK (version > 0)
```

## 4. Index và đường truy vấn

Danh sách gồm cả index tự sinh bởi PRIMARY KEY/UNIQUE; không tạo thêm bản trùng. Partial index chỉ áp dụng các dòng khớp WHERE.

```sql
CREATE INDEX ix_item_menu ON public.order_items USING btree (menu_item_id);
```

```sql
CREATE INDEX ix_items_batch ON public.order_items USING btree (batch_id);
```

```sql
CREATE INDEX ix_items_queue ON public.order_items USING btree (status, status_changed_at, id);
```

```sql
CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id);
```

## 5. Trigger và quy tắc liên bảng

```sql
CREATE CONSTRAINT TRIGGER business_integrity AFTER INSERT OR DELETE OR UPDATE ON order_items DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_business_integrity();
```

```sql
CREATE TRIGGER item_transition BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION check_item_transition();
```

```sql
CREATE TRIGGER paid_item_history BEFORE DELETE ON order_items FOR EACH ROW EXECUTE FUNCTION guard_paid_order_history_delete();
```

```sql
CREATE TRIGGER version_guard BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION check_version();
```

Phần thân và giải thích từng hàm trigger: [TRIGGERS.md](TRIGGERS.md). Trigger `business_integrity` là deferred constraint trigger, kiểm tại commit; không thể suy chỉ từ một INSERT riêng lẻ.

## 6. Vòng đời, lưu ý và giới hạn

- Mã/tên/giá snapshot và menu_item_id/batch_id không được đổi bởi UPDATE. Đổi menu không cập nhật đơn cũ; thay món cần thực hiện qua nghiệp vụ hủy/gọi mới.
- Trigger kiểm state machine và chỉ cho sửa quantity/note trước chuẩn bị. Không tăng quantity của dòng hiện có; gọi thêm qua batch mới.
- Chốt tiền chỉ khi mọi dòng SERVED/CANCELLED/REJECTED và không còn batch PENDING. Dòng hủy/từ chối được giữ, không tính tiền; trigger004 chặn DELETE mọi dòng của PAID.

## 7. Cập nhật tài liệu

File được sinh từ catalog metadata và phần giải thích đã review trong `scripts/db_doc_catalog.py`. Khi đổi schema/logic liên quan: thêm migration mới nếu cần, cập nhật catalog giải thích, SSOT và ADR cùng thay đổi; export metadata chỉ đọc rồi sinh lại. Chạy `python scripts/generate_db_docs.py --check` trước commit. Xem [quy trình đồng bộ](README.md#quy-trình-đồng-bộ-bắt-buộc).
