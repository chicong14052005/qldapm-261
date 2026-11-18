# `orders` — Đơn hàng

Đối chiếu schema: `202611180005_SingleActiveGuestPerVisit` · review 03/11/2026. [Danh mục DB](README.md) · [ADR-0003](../../ADR/0003-database.md).

## 1. Vai trò và phạm vi

Đơn nghiệp vụ chứa các đợt gọi món, dùng chung cho tại bàn và mang về. Đây là aggregate mà backend khóa trước khi sửa món, duyệt và chốt tiền.

Quy tắc nghiệp vụ: [P1.4](../../SSOT/P1.4-dat-mon-va-dieu-chinh-don.md), [P1.7](../../SSOT/P1.7-thanh-toan-va-hoan-tat.md).

## 2. Các trường

Kiểu, NULL và DEFAULT dưới đây là **định nghĩa tại PostgreSQL**, không phải giá trị mặc định của C#. “Không có” nghĩa là DB không tự cấp giá trị; backend có thể cấp khi tạo entity. PK/UQ/FK/CHECK được ghi đầy đủ ở mục 3.

| Trường | Kiểu PostgreSQL | Cho NULL | DEFAULT tại DB | Ý nghĩa và cách sử dụng |
|---|---|---|---|---|
| `id` | `uuid` | Không | Không có | Định danh UUID của bản ghi, khóa chính. Ứng dụng sinh Guid.NewGuid(); seed có thể dùng UUID cố định. Không có DEFAULT UUID tại DB. |
| `created_at` | `timestamp with time zone` | Không | `now()` | Thời điểm tạo bản ghi. Entity khởi tạo UTC; các bảng Mutable còn có DEFAULT now() tại DB từ migration002. Không dùng làm thời điểm thanh toán hoặc phục vụ. |
| `updated_at` | `timestamp with time zone` | Không | `now()` | Thời điểm cập nhật gần nhất. Backend gọi Touch(); CHECK yêu cầu không trước created_at. Trigger không tự gán now(), nên writer phải cấp thời điểm đúng. |
| `version` | `bigint` | Không | `1` | Phiên bản optimistic concurrency, ban đầu 1. API so expectedVersion; trigger DB yêu cầu mỗi UPDATE tăng chính xác 1. Không phải số phiên bản migration. |
| `code` | `character varying(32)` | Không | Không có | Mã đơn duy nhất, backend sinh DH-...; DB NOT NULL/UQ/tối đa 32 ký tự, không CHECK riêng mẫu DH-. |
| `order_type` | `character varying(12)` | Không | Không có | DINE_IN hoặc TAKEAWAY; entity mặc định DINE_IN, DB không DEFAULT. Không đổi sau tạo theo trigger. |
| `visit_id` | `uuid` | Có | Không có | FK/UQ đến visits.id, bắt buộc cho DINE_IN và NULL cho TAKEAWAY. UNIQUE cho phép nhiều NULL của các đơn mang về. |
| `pickup_code` | `character varying(16)` | Có | Không có | Mã nhận đơn mang về do backend sinh MV-..., UNIQUE. Bắt buộc cho TAKEAWAY, NULL cho tại bàn; DB không kiểm tiền tố hay chuỗi trắng. |
| `pickup_name` | `character varying(120)` | Có | Không có | Tên người nhận mang về tùy chọn, tối đa 120 ký tự. Tại bàn phải NULL. Đây là nhãn nhận hàng, không phải tài khoản khách. |
| `status` | `character varying(20)` | Không | Không có | SERVING, AWAITING_PAYMENT, PAID hoặc CANCELLED. Entity mặc định SERVING; DB không DEFAULT. Không suy trạng thái từ việc có món READY. |
| `total_vnd` | `bigint` | Có | Không có | Tổng VND đã chốt. NULL ở SERVING/CANCELLED; AWAITING_PAYMENT/PAID bắt buộc 0..10^12, bằng tổng dòng SERVED tại commit. Không lưu tổng tạm liên tục. |
| `created_by_staff_id` | `uuid` | Không | Không có | Nhân viên khởi tạo đơn, FK RESTRICT đến staff_users.id; tại bàn là nhân viên mở lượt. Khách gửi món qua các batch, không tạo staff giả. |
| `status_changed_at` | `timestamp with time zone` | Không | Không có | Thời điểm chuyển trạng thái gần nhất, server gán UTC; sửa thông tin không nhất thiết đổi mốc này. Không có DEFAULT tại DB. |

## 3. Khóa, quan hệ và ràng buộc tại DB

Các định nghĩa sau lấy từ PostgreSQL catalog sau khi áp dụng đủ chuỗi migration đã ghi ở đầu file. FK `RESTRICT` ngăn xóa bản ghi đang được tham chiếu; không có cascade xóa nghiệp vụ. CHECK không thay cho phân quyền và validation ở service.

Tham chiếu tới: [staff_users](staff_users.md), [visits](visits.md).

Được tham chiếu bởi: [order_batches](order_batches.md), [payments](payments.md).

### `business_integrity`

```sql
TRIGGER DEFERRABLE INITIALLY DEFERRED
```

### `ck_orders_timestamps`

```sql
CHECK (updated_at >= created_at)
```

### `orders_check`

```sql
CHECK (order_type::text = 'DINE_IN'::text AND visit_id IS NOT NULL AND pickup_code IS NULL AND pickup_name IS NULL OR order_type::text = 'TAKEAWAY'::text AND visit_id IS NULL AND pickup_code IS NOT NULL)
```

### `orders_check1`

```sql
CHECK ((status::text = ANY (ARRAY['SERVING'::character varying, 'CANCELLED'::character varying]::text[])) AND total_vnd IS NULL OR (status::text = ANY (ARRAY['AWAITING_PAYMENT'::character varying, 'PAID'::character varying]::text[])) AND total_vnd IS NOT NULL AND total_vnd >= 0 AND total_vnd <= '1000000000000'::bigint)
```

### `orders_code_key`

```sql
UNIQUE (code)
```

### `orders_created_by_staff_id_fkey`

```sql
FOREIGN KEY (created_by_staff_id) REFERENCES staff_users(id) ON DELETE RESTRICT
```

### `orders_order_type_check`

```sql
CHECK (order_type::text = ANY (ARRAY['DINE_IN'::character varying, 'TAKEAWAY'::character varying]::text[]))
```

### `orders_pickup_code_key`

```sql
UNIQUE (pickup_code)
```

### `orders_pkey`

```sql
PRIMARY KEY (id)
```

### `orders_status_check`

```sql
CHECK (status::text = ANY (ARRAY['SERVING'::character varying, 'AWAITING_PAYMENT'::character varying, 'PAID'::character varying, 'CANCELLED'::character varying]::text[]))
```

### `orders_version_check`

```sql
CHECK (version > 0)
```

### `orders_visit_id_fkey`

```sql
FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE RESTRICT
```

### `orders_visit_id_key`

```sql
UNIQUE (visit_id)
```

## 4. Index và đường truy vấn

Danh sách gồm cả index tự sinh bởi PRIMARY KEY/UNIQUE; không tạo thêm bản trùng. Partial index chỉ áp dụng các dòng khớp WHERE.

```sql
CREATE INDEX ix_order_creator ON public.orders USING btree (created_by_staff_id);
```

```sql
CREATE INDEX ix_orders_status ON public.orders USING btree (status, created_at);
```

```sql
CREATE UNIQUE INDEX orders_code_key ON public.orders USING btree (code);
```

```sql
CREATE UNIQUE INDEX orders_pickup_code_key ON public.orders USING btree (pickup_code);
```

```sql
CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);
```

```sql
CREATE UNIQUE INDEX orders_visit_id_key ON public.orders USING btree (visit_id);
```

## 5. Trigger và quy tắc liên bảng

```sql
CREATE CONSTRAINT TRIGGER business_integrity AFTER INSERT OR DELETE OR UPDATE ON orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_business_integrity();
```

```sql
CREATE TRIGGER order_guard BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION guard_order();
```

```sql
CREATE TRIGGER version_guard BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION check_version();
```

Phần thân và giải thích từng hàm trigger: [TRIGGERS.md](TRIGGERS.md). Trigger `business_integrity` là deferred constraint trigger, kiểm tại commit; không thể suy chỉ từ một INSERT riêng lẻ.

## 6. Vòng đời, lưu ý và giới hạn

- DINE_IN gắn một visit và mỗi visit tối đa một order; TAKEAWAY có pickup_code, không có visit. Không lưu table_id trùng đường order→visit→table.
- SERVING → AWAITING_PAYMENT → PAID; có thể mở lại AWAITING_PAYMENT → SERVING trước thu tiền. SERVING có thể CANCELLED khi đủ điều kiện; PAID/CANCELLED không sửa được.
- Tổng tạm tính được tính từ dòng hợp lệ; chỉ lưu total_vnd khi chờ trả/đã trả. Trigger deferred kiểm tổng, trạng thái món, batch và payment tại commit.

## 7. Cập nhật tài liệu

File được sinh từ catalog metadata và phần giải thích đã review trong `scripts/db_doc_catalog.py`. Khi đổi schema/logic liên quan: thêm migration mới nếu cần, cập nhật catalog giải thích, SSOT và ADR cùng thay đổi; export metadata chỉ đọc rồi sinh lại. Chạy `python scripts/generate_db_docs.py --check` trước commit. Xem [quy trình đồng bộ](README.md#quy-trình-đồng-bộ-bắt-buộc).
