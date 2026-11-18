# `order_batches` — Đợt gọi món và phê duyệt

Đối chiếu schema: `202611180005_SingleActiveGuestPerVisit` · review 03/11/2026. [Danh mục DB](README.md) · [ADR-0003](../../ADR/0003-database.md).

## 1. Vai trò và phạm vi

Mỗi lần gửi món tạo một batch chứa 1–50 dòng. Đợt đầu tự APPROVED; mọi đợt gọi thêm cần duyệt trước khi vào bếp.

Quy tắc nghiệp vụ: [P1.4](../../SSOT/P1.4-dat-mon-va-dieu-chinh-don.md), [P1.5](../../SSOT/P1.5-xu-ly-mon-tai-bep.md).

## 2. Các trường

Kiểu, NULL và DEFAULT dưới đây là **định nghĩa tại PostgreSQL**, không phải giá trị mặc định của C#. “Không có” nghĩa là DB không tự cấp giá trị; backend có thể cấp khi tạo entity. PK/UQ/FK/CHECK được ghi đầy đủ ở mục 3.

| Trường | Kiểu PostgreSQL | Cho NULL | DEFAULT tại DB | Ý nghĩa và cách sử dụng |
|---|---|---|---|---|
| `id` | `uuid` | Không | Không có | Định danh UUID của bản ghi, khóa chính. Ứng dụng sinh Guid.NewGuid(); seed có thể dùng UUID cố định. Không có DEFAULT UUID tại DB. |
| `created_at` | `timestamp with time zone` | Không | `now()` | Thời điểm tạo bản ghi. Entity khởi tạo UTC; các bảng Mutable còn có DEFAULT now() tại DB từ migration002. Không dùng làm thời điểm thanh toán hoặc phục vụ. |
| `updated_at` | `timestamp with time zone` | Không | `now()` | Thời điểm cập nhật gần nhất. Backend gọi Touch(); CHECK yêu cầu không trước created_at. Trigger không tự gán now(), nên writer phải cấp thời điểm đúng. |
| `version` | `bigint` | Không | `1` | Phiên bản optimistic concurrency, ban đầu 1. API so expectedVersion; trigger DB yêu cầu mỗi UPDATE tăng chính xác 1. Không phải số phiên bản migration. |
| `order_id` | `uuid` | Không | Không có | Đơn sở hữu đợt, FK RESTRICT đến orders.id; không đổi sau tạo. |
| `sequence_no` | `integer` | Không | Không có | Số thứ tự đợt trong đơn, >0, UNIQUE cùng order_id. Đợt 1 phải APPROVED theo CHECK. |
| `status` | `character varying(12)` | Không | Không có | PENDING/APPROVED/REJECTED/WITHDRAWN. Entity mặc định PENDING nhưng backend đặt APPROVED cho đợt đầu. DB không DEFAULT. |
| `submitted_by_staff_id` | `uuid` | Có | Không có | Nhân viên gửi đợt, FK staff_users; NULL nếu khách gửi. Chính xác một trong hai trường submitter phải có giá trị. |
| `submitted_by_guest_session_id` | `uuid` | Có | Không có | Phiên khách gửi đợt, FK guest_sessions; NULL nếu nhân viên gửi. Trigger kiểm phiên thuộc đúng visit của order. |
| `reviewed_by_staff_id` | `uuid` | Có | Không có | Nhân viên duyệt/từ chối đợt thêm, FK staff_users. NULL cho đợt đầu, PENDING hoặc WITHDRAWN; bắt buộc khi đợt thêm APPROVED/REJECTED. |
| `reviewed_at` | `timestamp with time zone` | Có | Không có | Thời điểm quyết định đợt thêm, theo cùng điều kiện reviewer; nếu có phải >= created_at. |
| `decision_reason` | `character varying(500)` | Có | Không có | Lý do từ chối đợt thêm, bắt buộc không trắng khi REJECTED; NULL cho các trạng thái khác theo CHECK. Tối đa 500 ký tự. |
| `eligible_at` | `timestamp with time zone` | Có | Không có | Thời điểm đủ điều kiện vào bếp, chỉ APPROVED có giá trị và phải >= created_at. Đợt đầu dùng thời điểm gửi; đợt thêm dùng thời điểm duyệt. |

## 3. Khóa, quan hệ và ràng buộc tại DB

Các định nghĩa sau lấy từ PostgreSQL catalog sau khi áp dụng đủ chuỗi migration đã ghi ở đầu file. FK `RESTRICT` ngăn xóa bản ghi đang được tham chiếu; không có cascade xóa nghiệp vụ. CHECK không thay cho phân quyền và validation ở service.

Tham chiếu tới: [guest_sessions](guest_sessions.md), [orders](orders.md), [staff_users](staff_users.md).

Được tham chiếu bởi: [order_items](order_items.md).

### `business_integrity`

```sql
TRIGGER DEFERRABLE INITIALLY DEFERRED
```

### `ck_eligible_time`

```sql
CHECK (eligible_at IS NULL OR eligible_at >= created_at)
```

### `ck_order_batches_timestamps`

```sql
CHECK (updated_at >= created_at)
```

### `ck_reviewed_time`

```sql
CHECK (reviewed_at IS NULL OR reviewed_at >= created_at)
```

### `order_batches_check`

```sql
CHECK (num_nonnulls(submitted_by_staff_id, submitted_by_guest_session_id) = 1)
```

### `order_batches_check1`

```sql
CHECK (status::text = 'APPROVED'::text AND eligible_at IS NOT NULL OR status::text <> 'APPROVED'::text AND eligible_at IS NULL)
```

### `order_batches_check2`

```sql
CHECK (sequence_no = 1 AND status::text = 'APPROVED'::text AND reviewed_by_staff_id IS NULL AND reviewed_at IS NULL AND decision_reason IS NULL OR sequence_no > 1 AND (status::text = ANY (ARRAY['PENDING'::character varying, 'WITHDRAWN'::character varying]::text[])) AND reviewed_by_staff_id IS NULL AND reviewed_at IS NULL AND decision_reason IS NULL OR sequence_no > 1 AND status::text = 'APPROVED'::text AND reviewed_by_staff_id IS NOT NULL AND reviewed_at IS NOT NULL AND decision_reason IS NULL OR sequence_no > 1 AND status::text = 'REJECTED'::text AND reviewed_by_staff_id IS NOT NULL AND reviewed_at IS NOT NULL AND decision_reason IS NOT NULL AND btrim(decision_reason::text) <> ''::text)
```

### `order_batches_order_id_fkey`

```sql
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT
```

### `order_batches_order_id_sequence_no_key`

```sql
UNIQUE (order_id, sequence_no)
```

### `order_batches_pkey`

```sql
PRIMARY KEY (id)
```

### `order_batches_reviewed_by_staff_id_fkey`

```sql
FOREIGN KEY (reviewed_by_staff_id) REFERENCES staff_users(id) ON DELETE RESTRICT
```

### `order_batches_sequence_no_check`

```sql
CHECK (sequence_no > 0)
```

### `order_batches_status_check`

```sql
CHECK (status::text = ANY (ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'WITHDRAWN'::character varying]::text[]))
```

### `order_batches_submitted_by_guest_session_id_fkey`

```sql
FOREIGN KEY (submitted_by_guest_session_id) REFERENCES guest_sessions(id) ON DELETE RESTRICT
```

### `order_batches_submitted_by_staff_id_fkey`

```sql
FOREIGN KEY (submitted_by_staff_id) REFERENCES staff_users(id) ON DELETE RESTRICT
```

### `order_batches_version_check`

```sql
CHECK (version > 0)
```

## 4. Index và đường truy vấn

Danh sách gồm cả index tự sinh bởi PRIMARY KEY/UNIQUE; không tạo thêm bản trùng. Partial index chỉ áp dụng các dòng khớp WHERE.

```sql
CREATE INDEX ix_batch_reviewer ON public.order_batches USING btree (reviewed_by_staff_id);
```

```sql
CREATE INDEX ix_batch_submit_guest ON public.order_batches USING btree (submitted_by_guest_session_id);
```

```sql
CREATE INDEX ix_batch_submit_staff ON public.order_batches USING btree (submitted_by_staff_id);
```

```sql
CREATE INDEX ix_batches_pending ON public.order_batches USING btree (status, created_at);
```

```sql
CREATE UNIQUE INDEX order_batches_order_id_sequence_no_key ON public.order_batches USING btree (order_id, sequence_no);
```

```sql
CREATE UNIQUE INDEX order_batches_pkey ON public.order_batches USING btree (id);
```

## 5. Trigger và quy tắc liên bảng

```sql
CREATE TRIGGER batch_guard BEFORE INSERT OR UPDATE ON order_batches FOR EACH ROW EXECUTE FUNCTION guard_batch();
```

```sql
CREATE CONSTRAINT TRIGGER business_integrity AFTER INSERT OR DELETE OR UPDATE ON order_batches DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_business_integrity();
```

```sql
CREATE TRIGGER paid_batch_history BEFORE DELETE ON order_batches FOR EACH ROW EXECUTE FUNCTION guard_paid_order_history_delete();
```

```sql
CREATE TRIGGER version_guard BEFORE UPDATE ON order_batches FOR EACH ROW EXECUTE FUNCTION check_version();
```

Phần thân và giải thích từng hàm trigger: [TRIGGERS.md](TRIGGERS.md). Trigger `business_integrity` là deferred constraint trigger, kiểm tại commit; không thể suy chỉ từ một INSERT riêng lẻ.

## 6. Vòng đời, lưu ý và giới hạn

- sequence_no bắt đầu 1 và duy nhất trong order. Backend khóa order để cấp số đợt; DB không tự tính MAX+1.
- Đợt thêm PENDING → APPROVED/REJECTED/WITHDRAWN; quyết định cuối không sửa. Chỉ manager/admin được tự duyệt đợt mình gửi; trigger kiểm trường hợp này.
- Eligible_at khác created_at: queue bếp chỉ được nhận sau phê duyệt. Batch đầu approved không có reviewer; không tạo người duyệt giả.
- Deferred trigger kiểm 1–50 items và trạng thái batch/item khớp. Dòng thuộc PAID được giữ, trigger004 chặn DELETE batch đã thanh toán.

## 7. Cập nhật tài liệu

File được sinh từ catalog metadata và phần giải thích đã review trong `scripts/db_doc_catalog.py`. Khi đổi schema/logic liên quan: thêm migration mới nếu cần, cập nhật catalog giải thích, SSOT và ADR cùng thay đổi; export metadata chỉ đọc rồi sinh lại. Chạy `python scripts/generate_db_docs.py --check` trước commit. Xem [quy trình đồng bộ](README.md#quy-trình-đồng-bộ-bắt-buộc).
