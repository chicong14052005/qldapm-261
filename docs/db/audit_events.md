# `audit_events` — Nhật ký nghiệp vụ

Đối chiếu schema: `202611180005_SingleActiveGuestPerVisit` · review 03/11/2026. [Danh mục DB](README.md) · [ADR-0003](../../ADR/0003-database.md).

## 1. Vai trò và phạm vi

Nhật ký append-only cho hành động quan trọng: actor, đối tượng, thời điểm, trạng thái trước/sau và lý do. Hỗ trợ truy vết thay vì suy toàn bộ lịch sử từ updated_at.

Quy tắc nghiệp vụ: [P1.1](../../SSOT/P1.1-tai-khoan-va-phan-quyen.md), [P1.3](../../SSOT/P1.3-ban-va-luot-khach.md), [P1.4](../../SSOT/P1.4-dat-mon-va-dieu-chinh-don.md), [P1.5](../../SSOT/P1.5-xu-ly-mon-tai-bep.md), [P1.6](../../SSOT/P1.6-theo-doi-va-phuc-vu.md), [P1.7](../../SSOT/P1.7-thanh-toan-va-hoan-tat.md).

## 2. Các trường

Kiểu, NULL và DEFAULT dưới đây là **định nghĩa tại PostgreSQL**, không phải giá trị mặc định của C#. “Không có” nghĩa là DB không tự cấp giá trị; backend có thể cấp khi tạo entity. PK/UQ/FK/CHECK được ghi đầy đủ ở mục 3.

| Trường | Kiểu PostgreSQL | Cho NULL | DEFAULT tại DB | Ý nghĩa và cách sử dụng |
|---|---|---|---|---|
| `id` | `uuid` | Không | Không có | Định danh UUID của bản ghi, khóa chính. Ứng dụng sinh Guid.NewGuid(); seed có thể dùng UUID cố định. Không có DEFAULT UUID tại DB. |
| `occurred_at` | `timestamp with time zone` | Không | Không có | Thời điểm sự kiện theo UTC, entity mặc định hiện tại; DB không DEFAULT. |
| `actor_kind` | `character varying(8)` | Không | Không có | STAFF/GUEST/SYSTEM. CHECK buộc cặp actor ID phù hợp; entity mặc định STAFF, DB không DEFAULT. |
| `actor_staff_id` | `uuid` | Có | Không có | Nhân viên thực hiện, FK RESTRICT; bắt buộc khi STAFF, NULL khi GUEST/SYSTEM. |
| `actor_guest_session_id` | `uuid` | Có | Không có | Phiên khách thực hiện, FK RESTRICT; bắt buộc khi GUEST, NULL khi STAFF/SYSTEM. |
| `action` | `character varying(64)` | Không | Không có | Mã hành động do writer định nghĩa, tối đa 64 ký tự; ví dụ PAYMENT_RECORDED, ITEM_READY. DB không có danh sách CHECK action. |
| `target_type` | `character varying(32)` | Không | Không có | Loại đối tượng trong danh sách CHECK: STAFF_USER/USER_ROLE/MENU_CATEGORY/MENU_ITEM/TABLE/VISIT/GUEST_SESSION/ORDER/BATCH/ORDER_ITEM/PAYMENT. |
| `target_id` | `uuid` | Không | Không có | UUID đối tượng được tác động. Không có FK đa hình; phải hiểu cùng target_type. |
| `before_data` | `jsonb` | Có | Không có | Object JSONB trước thay đổi hoặc NULL cho tạo mới. Khi khác NULL, DB kiểm jsonb_typeof = object. |
| `after_data` | `jsonb` | Có | Không có | Object JSONB sau thay đổi hoặc NULL. Ít nhất một trong before_data/after_data phải không NULL. |
| `reason` | `character varying(500)` | Có | Không có | Lý do nghiệp vụ tối đa 500 ký tự hoặc NULL. Service bắt buộc ở các hành động cần lý do; DB không CHECK theo từng action. |
| `request_id` | `uuid` | Không | Không có | UUID server sinh cho request qua RequestId trong ApiService; không phải token phiên hoặc idempotency key. DB chỉ kiểm NOT NULL. |
| `correlation_id` | `uuid` | Không | Không có | UUID liên kết sự kiện trong cùng ngữ cảnh. Hiện writer dùng cùng RequestId; chưa có distributed tracing correlation riêng. |

## 3. Khóa, quan hệ và ràng buộc tại DB

Các định nghĩa sau lấy từ PostgreSQL catalog sau khi áp dụng đủ chuỗi migration đã ghi ở đầu file. FK `RESTRICT` ngăn xóa bản ghi đang được tham chiếu; không có cascade xóa nghiệp vụ. CHECK không thay cho phân quyền và validation ở service.

Tham chiếu tới: [guest_sessions](guest_sessions.md), [staff_users](staff_users.md).

### `audit_events_actor_guest_session_id_fkey`

```sql
FOREIGN KEY (actor_guest_session_id) REFERENCES guest_sessions(id) ON DELETE RESTRICT
```

### `audit_events_actor_kind_check`

```sql
CHECK (actor_kind::text = ANY (ARRAY['STAFF'::character varying, 'GUEST'::character varying, 'SYSTEM'::character varying]::text[]))
```

### `audit_events_actor_staff_id_fkey`

```sql
FOREIGN KEY (actor_staff_id) REFERENCES staff_users(id) ON DELETE RESTRICT
```

### `audit_events_check`

```sql
CHECK (actor_kind::text = 'STAFF'::text AND actor_staff_id IS NOT NULL AND actor_guest_session_id IS NULL OR actor_kind::text = 'GUEST'::text AND actor_staff_id IS NULL AND actor_guest_session_id IS NOT NULL OR actor_kind::text = 'SYSTEM'::text AND actor_staff_id IS NULL AND actor_guest_session_id IS NULL)
```

### `audit_events_check1`

```sql
CHECK (before_data IS NOT NULL OR after_data IS NOT NULL)
```

### `audit_events_pkey`

```sql
PRIMARY KEY (id)
```

### `ck_audit_json`

```sql
CHECK ((before_data IS NULL OR jsonb_typeof(before_data) = 'object'::text) AND (after_data IS NULL OR jsonb_typeof(after_data) = 'object'::text))
```

### `ck_audit_target`

```sql
CHECK (target_type::text = ANY (ARRAY['STAFF_USER'::character varying, 'USER_ROLE'::character varying, 'MENU_CATEGORY'::character varying, 'MENU_ITEM'::character varying, 'TABLE'::character varying, 'VISIT'::character varying, 'GUEST_SESSION'::character varying, 'ORDER'::character varying, 'BATCH'::character varying, 'ORDER_ITEM'::character varying, 'PAYMENT'::character varying]::text[]))
```

## 4. Index và đường truy vấn

Danh sách gồm cả index tự sinh bởi PRIMARY KEY/UNIQUE; không tạo thêm bản trùng. Partial index chỉ áp dụng các dòng khớp WHERE.

```sql
CREATE UNIQUE INDEX audit_events_pkey ON public.audit_events USING btree (id);
```

```sql
CREATE INDEX ix_audit_action ON public.audit_events USING btree (action, occurred_at);
```

```sql
CREATE INDEX ix_audit_guest ON public.audit_events USING btree (actor_guest_session_id);
```

```sql
CREATE INDEX ix_audit_staff ON public.audit_events USING btree (actor_staff_id);
```

```sql
CREATE INDEX ix_audit_target ON public.audit_events USING btree (target_type, target_id, occurred_at);
```

## 5. Trigger và quy tắc liên bảng

```sql
CREATE TRIGGER immutable_audit BEFORE DELETE OR UPDATE ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_mutation();
```

Phần thân và giải thích từng hàm trigger: [TRIGGERS.md](TRIGGERS.md). Trigger `business_integrity` là deferred constraint trigger, kiểm tại commit; không thể suy chỉ từ một INSERT riêng lẻ.

## 6. Vòng đời, lưu ý và giới hạn

- Backend ghi audit cùng transaction nghiệp vụ; trigger DB chặn UPDATE/DELETE. Không lưu mật khẩu, token, ciphertext QR, cookie hoặc secret vào JSON.
- target_id là quan hệ đa hình nên không có FK; backend phải chỉ đúng đối tượng. DB không tự bảo đảm mọi thao tác có audit.
- Actor SYSTEM dùng cho seed/nâng cấp, không có staff/guest. JSON lưu object, không phải mảng hoặc chuỗi JSON lồng.

## 7. Cập nhật tài liệu

File được sinh từ catalog metadata và phần giải thích đã review trong `scripts/db_doc_catalog.py`. Khi đổi schema/logic liên quan: thêm migration mới nếu cần, cập nhật catalog giải thích, SSOT và ADR cùng thay đổi; export metadata chỉ đọc rồi sinh lại. Chạy `python scripts/generate_db_docs.py --check` trước commit. Xem [quy trình đồng bộ](README.md#quy-trình-đồng-bộ-bắt-buộc).
