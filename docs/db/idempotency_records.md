# `idempotency_records` — Chống thực hiện lặp command

Đối chiếu schema: `202611180005_SingleActiveGuestPerVisit` · review 03/11/2026. [Danh mục DB](README.md) · [ADR-0003](../../ADR/0003-database.md).

## 1. Vai trò và phạm vi

Lưu fingerprint request và response đã mã hóa để retry cùng key không tạo lại order/batch/payment. Key được phân vùng theo đúng actor, không dùng chung giữa các khách/nhân viên.

Quy tắc nghiệp vụ: [P1.4](../../SSOT/P1.4-dat-mon-va-dieu-chinh-don.md), [P1.7](../../SSOT/P1.7-thanh-toan-va-hoan-tat.md).

## 2. Các trường

Kiểu, NULL và DEFAULT dưới đây là **định nghĩa tại PostgreSQL**, không phải giá trị mặc định của C#. “Không có” nghĩa là DB không tự cấp giá trị; backend có thể cấp khi tạo entity. PK/UQ/FK/CHECK được ghi đầy đủ ở mục 3.

| Trường | Kiểu PostgreSQL | Cho NULL | DEFAULT tại DB | Ý nghĩa và cách sử dụng |
|---|---|---|---|---|
| `id` | `uuid` | Không | Không có | Định danh UUID của bản ghi, khóa chính. Ứng dụng sinh Guid.NewGuid(); seed có thể dùng UUID cố định. Không có DEFAULT UUID tại DB. |
| `actor_staff_id` | `uuid` | Có | Không có | Nhân viên thực hiện command, FK RESTRICT; chính xác một actor_staff_id hoặc actor_guest_session_id có giá trị. |
| `actor_guest_session_id` | `uuid` | Có | Không có | Phiên khách thực hiện command, FK RESTRICT; NULL khi actor là nhân viên. |
| `key` | `uuid` | Không | Không có | UUID client gửi ở Idempotency-Key. UNIQUE theo actor bằng hai partial indexes; không phải khóa chính toàn cục. |
| `method` | `character varying(8)` | Không | Không có | HTTP method của request, tối đa 8 ký tự; tham gia fingerprint, ví dụ POST/PATCH. DB không CHECK danh sách verb. |
| `route` | `character varying(200)` | Không | Không có | Đường dẫn Http.Request.Path của command, tối đa 200 ký tự, không phải URL đầy đủ. Backend đưa method/path/body vào fingerprint. |
| `request_hash` | `bytea` | Không | Không có | Hash SHA-256 dài 32 byte của fingerprint request, dùng đối chiếu retry; không phải hash response hoặc mật khẩu. |
| `response_status` | `smallint` | Không | Không có | Mã HTTP thành công, CHECK 200–299. Entity/service hiện mặc định 200; không dùng lưu lỗi nghiệp vụ. |
| `response_ciphertext` | `bytea` | Có | Không có | Response JSON đã mã hóa, bytea hoặc NULL. Replay đòi còn payload và còn hạn. Không hiển thị ciphertext cho người dùng. |
| `encryption_key_id` | `character varying(64)` | Có | Không có | Nhãn cơ chế mã hóa, service hiện ghi aspnet-data-protection-v1; không phải secret hoặc ID thực của từng khóa Data Protection. |
| `created_at` | `timestamp with time zone` | Không | Không có | Thời điểm ghi command thành công theo UTC, entity gán; DB không DEFAULT. |
| `replay_until` | `timestamp with time zone` | Không | Không có | Hạn cho phép phát lại response, phải sau created_at. Entity mặc định UTC hiện tại +24h; DB không buộc khoảng 24h. |

## 3. Khóa, quan hệ và ràng buộc tại DB

Các định nghĩa sau lấy từ PostgreSQL catalog sau khi áp dụng đủ chuỗi migration đã ghi ở đầu file. FK `RESTRICT` ngăn xóa bản ghi đang được tham chiếu; không có cascade xóa nghiệp vụ. CHECK không thay cho phân quyền và validation ở service.

Tham chiếu tới: [guest_sessions](guest_sessions.md), [staff_users](staff_users.md).

### `idempotency_records_actor_guest_session_id_fkey`

```sql
FOREIGN KEY (actor_guest_session_id) REFERENCES guest_sessions(id) ON DELETE RESTRICT
```

### `idempotency_records_actor_staff_id_fkey`

```sql
FOREIGN KEY (actor_staff_id) REFERENCES staff_users(id) ON DELETE RESTRICT
```

### `idempotency_records_check`

```sql
CHECK (replay_until > created_at)
```

### `idempotency_records_check1`

```sql
CHECK (num_nonnulls(actor_staff_id, actor_guest_session_id) = 1)
```

### `idempotency_records_pkey`

```sql
PRIMARY KEY (id)
```

### `idempotency_records_request_hash_check`

```sql
CHECK (octet_length(request_hash) = 32)
```

### `idempotency_records_response_status_check`

```sql
CHECK (response_status >= 200 AND response_status <= 299)
```

## 4. Index và đường truy vấn

Danh sách gồm cả index tự sinh bởi PRIMARY KEY/UNIQUE; không tạo thêm bản trùng. Partial index chỉ áp dụng các dòng khớp WHERE.

```sql
CREATE UNIQUE INDEX idempotency_records_pkey ON public.idempotency_records USING btree (id);
```

```sql
CREATE UNIQUE INDEX ux_idempotency_guest ON public.idempotency_records USING btree (actor_guest_session_id, key) WHERE (actor_guest_session_id IS NOT NULL);
```

```sql
CREATE UNIQUE INDEX ux_idempotency_staff ON public.idempotency_records USING btree (actor_staff_id, key) WHERE (actor_staff_id IS NOT NULL);
```

## 5. Trigger và quy tắc liên bảng

Không có user-defined trigger trên bảng này. Các FK/CHECK ở trên vẫn được PostgreSQL thực thi.

## 6. Vòng đời, lưu ý và giới hạn

- Business command lấy advisory transaction lock theo actor/key; cùng key và cùng request trả response cũ. Cùng key khác method/route/body trả 409.
- Replay mặc định 24 giờ theo entity; hết hạn/ciphertext không còn thì 410. Không tái sử dụng key để chạy command mới.
- Response mã hóa Data Protection, cần giữ keyring /keys. Schema cho phép NULL payload/key label nhưng hiện service luôn ghi cặp khi command thành công; chưa có job cleanup tự động.
- Chỉ ghi kết quả command thành công cùng transaction nghiệp vụ; không ghi mọi GET/login/logout vào bảng này.

## 7. Cập nhật tài liệu

File được sinh từ catalog metadata và phần giải thích đã review trong `scripts/db_doc_catalog.py`. Khi đổi schema/logic liên quan: thêm migration mới nếu cần, cập nhật catalog giải thích, SSOT và ADR cùng thay đổi; export metadata chỉ đọc rồi sinh lại. Chạy `python scripts/generate_db_docs.py --check` trước commit. Xem [quy trình đồng bộ](README.md#quy-trình-đồng-bộ-bắt-buộc).
