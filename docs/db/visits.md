# `visits` — Lượt khách tại bàn

Đối chiếu schema: `202611180005_SingleActiveGuestPerVisit` · review 03/11/2026. [Danh mục DB](README.md) · [ADR-0003](../../ADR/0003-database.md).

## 1. Vai trò và phạm vi

Đại diện một nhóm khách sử dụng một bàn từ mở lượt đến thanh toán/hủy. Tách lượt khỏi bàn để khách ở lượt mới không đọc đơn của lượt trước.

Quy tắc nghiệp vụ: [P1.3](../../SSOT/P1.3-ban-va-luot-khach.md), [P1.7](../../SSOT/P1.7-thanh-toan-va-hoan-tat.md).

## 2. Các trường

Kiểu, NULL và DEFAULT dưới đây là **định nghĩa tại PostgreSQL**, không phải giá trị mặc định của C#. “Không có” nghĩa là DB không tự cấp giá trị; backend có thể cấp khi tạo entity. PK/UQ/FK/CHECK được ghi đầy đủ ở mục 3.

| Trường | Kiểu PostgreSQL | Cho NULL | DEFAULT tại DB | Ý nghĩa và cách sử dụng |
|---|---|---|---|---|
| `id` | `uuid` | Không | Không có | Định danh UUID của bản ghi, khóa chính. Ứng dụng sinh Guid.NewGuid(); seed có thể dùng UUID cố định. Không có DEFAULT UUID tại DB. |
| `created_at` | `timestamp with time zone` | Không | `now()` | Thời điểm tạo bản ghi. Entity khởi tạo UTC; các bảng Mutable còn có DEFAULT now() tại DB từ migration002. Không dùng làm thời điểm thanh toán hoặc phục vụ. |
| `updated_at` | `timestamp with time zone` | Không | `now()` | Thời điểm cập nhật gần nhất. Backend gọi Touch(); CHECK yêu cầu không trước created_at. Trigger không tự gán now(), nên writer phải cấp thời điểm đúng. |
| `version` | `bigint` | Không | `1` | Phiên bản optimistic concurrency, ban đầu 1. API so expectedVersion; trigger DB yêu cầu mỗi UPDATE tăng chính xác 1. Không phải số phiên bản migration. |
| `table_id` | `uuid` | Không | Không có | Bàn sử dụng, FK RESTRICT đến restaurant_tables.id. Không đổi bàn của lượt bằng UPDATE. |
| `table_code_snapshot` | `character varying(20)` | Không | Không có | Mã bàn tại lúc mở lượt, do backend sao chép từ bàn; dùng nhận diện lịch sử nếu mã bàn hiện tại thay đổi. DB yêu cầu NOT NULL, không có CHECK so với mã nguồn. |
| `status` | `character varying(12)` | Không | Không có | OPEN, CLOSED hoặc CANCELLED. Entity mặc định OPEN; DB không DEFAULT. CLOSED phải đi với order PAID; CANCELLED với order CANCELLED. |
| `party_size` | `smallint` | Không | Không có | Số người trong lượt, 1–30. Trigger lúc INSERT khóa bàn và kiểm không vượt capacity, bàn đang active. |
| `opened_by_staff_id` | `uuid` | Không | Không có | Nhân viên mở lượt, FK RESTRICT đến staff_users.id. Service kiểm role mở bàn. |
| `ended_at` | `timestamp with time zone` | Có | Không có | Thời điểm kết thúc lượt. OPEN bắt buộc NULL; lượt kết thúc bắt buộc có và không trước created_at. |
| `ended_by_staff_id` | `uuid` | Có | Không có | Nhân viên kết thúc lượt, thường người nhận tiền hoặc người hủy. OPEN bắt buộc NULL; kết thúc bắt buộc có FK staff_users. |

## 3. Khóa, quan hệ và ràng buộc tại DB

Các định nghĩa sau lấy từ PostgreSQL catalog sau khi áp dụng đủ chuỗi migration đã ghi ở đầu file. FK `RESTRICT` ngăn xóa bản ghi đang được tham chiếu; không có cascade xóa nghiệp vụ. CHECK không thay cho phân quyền và validation ở service.

Tham chiếu tới: [restaurant_tables](restaurant_tables.md), [staff_users](staff_users.md).

Được tham chiếu bởi: [guest_sessions](guest_sessions.md), [orders](orders.md).

### `business_integrity`

```sql
TRIGGER DEFERRABLE INITIALLY DEFERRED
```

### `ck_visits_timestamps`

```sql
CHECK (updated_at >= created_at)
```

### `visits_check`

```sql
CHECK (status::text = 'OPEN'::text AND ended_at IS NULL AND ended_by_staff_id IS NULL OR status::text <> 'OPEN'::text AND ended_at >= created_at AND ended_at IS NOT NULL AND ended_by_staff_id IS NOT NULL)
```

### `visits_ended_by_staff_id_fkey`

```sql
FOREIGN KEY (ended_by_staff_id) REFERENCES staff_users(id) ON DELETE RESTRICT
```

### `visits_opened_by_staff_id_fkey`

```sql
FOREIGN KEY (opened_by_staff_id) REFERENCES staff_users(id) ON DELETE RESTRICT
```

### `visits_party_size_check`

```sql
CHECK (party_size >= 1 AND party_size <= 30)
```

### `visits_pkey`

```sql
PRIMARY KEY (id)
```

### `visits_status_check`

```sql
CHECK (status::text = ANY (ARRAY['OPEN'::character varying, 'CLOSED'::character varying, 'CANCELLED'::character varying]::text[]))
```

### `visits_table_id_fkey`

```sql
FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE RESTRICT
```

### `visits_version_check`

```sql
CHECK (version > 0)
```

## 4. Index và đường truy vấn

Danh sách gồm cả index tự sinh bởi PRIMARY KEY/UNIQUE; không tạo thêm bản trùng. Partial index chỉ áp dụng các dòng khớp WHERE.

```sql
CREATE INDEX ix_visit_ended_by ON public.visits USING btree (ended_by_staff_id);
```

```sql
CREATE INDEX ix_visit_opened_by ON public.visits USING btree (opened_by_staff_id);
```

```sql
CREATE UNIQUE INDEX ux_visits_open ON public.visits USING btree (table_id) WHERE ((status)::text = 'OPEN'::text);
```

```sql
CREATE UNIQUE INDEX visits_pkey ON public.visits USING btree (id);
```

## 5. Trigger và quy tắc liên bảng

```sql
CREATE CONSTRAINT TRIGGER business_integrity AFTER INSERT OR DELETE OR UPDATE ON visits DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_business_integrity();
```

```sql
CREATE TRIGGER version_guard BEFORE UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION check_version();
```

```sql
CREATE TRIGGER visit_guard BEFORE INSERT OR UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION guard_visit();
```

Phần thân và giải thích từng hàm trigger: [TRIGGERS.md](TRIGGERS.md). Trigger `business_integrity` là deferred constraint trigger, kiểm tại commit; không thể suy chỉ từ một INSERT riêng lẻ.

## 6. Vòng đời, lưu ý và giới hạn

- Một bàn tối đa một lượt OPEN nhờ partial UNIQUE. Mở lượt phải tạo order tương ứng trong cùng transaction; deferred trigger kiểm liên kết.
- OPEN kết thúc thành CLOSED khi thu tiền hoặc CANCELLED khi hủy hợp lệ; không mở lại lượt đã kết thúc. Backend thu hồi guest_sessions cùng lúc.
- Migration003 đã bỏ join_code_hmac/join_generation. Khách tham gia bằng QR cố định vào lượt đang OPEN, không nhập mã tham gia.

## 7. Cập nhật tài liệu

File được sinh từ catalog metadata và phần giải thích đã review trong `scripts/db_doc_catalog.py`. Khi đổi schema/logic liên quan: thêm migration mới nếu cần, cập nhật catalog giải thích, SSOT và ADR cùng thay đổi; export metadata chỉ đọc rồi sinh lại. Chạy `python scripts/generate_db_docs.py --check` trước commit. Xem [quy trình đồng bộ](README.md#quy-trình-đồng-bộ-bắt-buộc).
