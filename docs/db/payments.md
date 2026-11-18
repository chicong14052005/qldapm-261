# `payments` — Thanh toán và người nhận

Đối chiếu schema: `202611180005_SingleActiveGuestPerVisit` · review 03/11/2026. [Danh mục DB](README.md) · [ADR-0003](../../ADR/0003-database.md).

## 1. Vai trò và phạm vi

Bản ghi xác nhận đã nhận toàn bộ tiền của một order, gồm thời điểm và snapshot người nhận. Một order tối đa một payment; không mô phỏng payment gateway hoặc giao dịch pending.

Quy tắc nghiệp vụ: [P1.7](../../SSOT/P1.7-thanh-toan-va-hoan-tat.md).

## 2. Các trường

Kiểu, NULL và DEFAULT dưới đây là **định nghĩa tại PostgreSQL**, không phải giá trị mặc định của C#. “Không có” nghĩa là DB không tự cấp giá trị; backend có thể cấp khi tạo entity. PK/UQ/FK/CHECK được ghi đầy đủ ở mục 3.

| Trường | Kiểu PostgreSQL | Cho NULL | DEFAULT tại DB | Ý nghĩa và cách sử dụng |
|---|---|---|---|---|
| `id` | `uuid` | Không | Không có | Định danh UUID của bản ghi, khóa chính. Ứng dụng sinh Guid.NewGuid(); seed có thể dùng UUID cố định. Không có DEFAULT UUID tại DB. |
| `order_id` | `uuid` | Không | Không có | Đơn được thanh toán, FK RESTRICT và UNIQUE; không có payment thứ hai cho cùng đơn. |
| `receipt_no` | `character varying(32)` | Không | Không có | Mã biên nhận nội bộ duy nhất, backend sinh BN-...; tối đa 32 ký tự. Không phải hóa đơn VAT/e-invoice pháp lý. |
| `method` | `character varying(16)` | Không | Không có | CASH, BANK_TRANSFER hoặc ZERO. CHECK gắn phương thức với số tiền, tendered_vnd và transfer_reference; không dùng CARD. |
| `amount_vnd` | `bigint` | Không | Không có | Số tiền thực ghi nhận VND nguyên 0..10^12; phải bằng orders.total_vnd qua deferred trigger. Client gửi amount để xác nhận, server đối chiếu. |
| `tendered_vnd` | `bigint` | Có | Không có | Tiền mặt khách đưa, chỉ CASH có giá trị và phải từ amount_vnd đến 10^12. BANK_TRANSFER/ZERO bắt buộc NULL. |
| `transfer_reference` | `character varying(120)` | Có | Không có | Mã/nội dung chuyển khoản tối đa 120 ký tự, chỉ BANK_TRANSFER bắt buộc không trắng. Không UNIQUE vì nội dung có thể trùng; CASH/ZERO phải NULL. |
| `paid_at` | `timestamp with time zone` | Không | Không có | Thời điểm server xác nhận nhận tiền. Entity UTC với millisecond để replay/đọc lại thống nhất; DB NOT NULL nhưng KHÔNG DEFAULT now(). UI và lọc ngày dùng UTC+07. |
| `received_by_staff_id` | `uuid` | Không | Không có | ID tài khoản thực hiện nhận tiền, FK RESTRICT; quyền CASHIER/MANAGER/ADMIN được service kiểm tại request. Không lấy từ payload. |
| `received_by_username_snapshot` | `character varying(64)` | Có | Không có | Username người nhận tại lúc thanh toán, varchar(64). Nullable cho dev cũ; INSERT mới bắt buộc đầy đủ/khớp staff. Không cập nhật khi hồ sơ đổi. |
| `received_by_display_name_snapshot` | `character varying(120)` | Có | Không có | Tên hiển thị người nhận tại lúc thanh toán, varchar(120). CHECK cùng NULL hoặc cùng có nội dung với username; INSERT mới bắt buộc khớp hồ sơ. |

## 3. Khóa, quan hệ và ràng buộc tại DB

Các định nghĩa sau lấy từ PostgreSQL catalog sau khi áp dụng đủ chuỗi migration đã ghi ở đầu file. FK `RESTRICT` ngăn xóa bản ghi đang được tham chiếu; không có cascade xóa nghiệp vụ. CHECK không thay cho phân quyền và validation ở service.

Tham chiếu tới: [orders](orders.md), [staff_users](staff_users.md).

### `business_integrity`

```sql
TRIGGER DEFERRABLE INITIALLY DEFERRED
```

### `ck_payment_recipient_snapshot`

```sql
CHECK (received_by_username_snapshot IS NULL AND received_by_display_name_snapshot IS NULL OR received_by_username_snapshot IS NOT NULL AND received_by_display_name_snapshot IS NOT NULL AND btrim(received_by_username_snapshot::text) <> ''::text AND btrim(received_by_display_name_snapshot::text) <> ''::text)
```

### `payments_amount_vnd_check`

```sql
CHECK (amount_vnd >= 0 AND amount_vnd <= '1000000000000'::bigint)
```

### `payments_check`

```sql
CHECK (method::text = 'ZERO'::text AND amount_vnd = 0 AND tendered_vnd IS NULL AND transfer_reference IS NULL OR method::text = 'CASH'::text AND amount_vnd > 0 AND tendered_vnd IS NOT NULL AND tendered_vnd >= amount_vnd AND tendered_vnd <= '1000000000000'::bigint AND transfer_reference IS NULL OR method::text = 'BANK_TRANSFER'::text AND amount_vnd > 0 AND tendered_vnd IS NULL AND transfer_reference IS NOT NULL AND btrim(transfer_reference::text) <> ''::text)
```

### `payments_method_check`

```sql
CHECK (method::text = ANY (ARRAY['CASH'::character varying, 'BANK_TRANSFER'::character varying, 'ZERO'::character varying]::text[]))
```

### `payments_order_id_fkey`

```sql
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT
```

### `payments_order_id_key`

```sql
UNIQUE (order_id)
```

### `payments_pkey`

```sql
PRIMARY KEY (id)
```

### `payments_receipt_no_key`

```sql
UNIQUE (receipt_no)
```

### `payments_received_by_staff_id_fkey`

```sql
FOREIGN KEY (received_by_staff_id) REFERENCES staff_users(id) ON DELETE RESTRICT
```

## 4. Index và đường truy vấn

Danh sách gồm cả index tự sinh bởi PRIMARY KEY/UNIQUE; không tạo thêm bản trùng. Partial index chỉ áp dụng các dòng khớp WHERE.

```sql
CREATE INDEX ix_payment_staff ON public.payments USING btree (received_by_staff_id);
```

```sql
CREATE INDEX ix_payments_history ON public.payments USING btree (paid_at DESC, id DESC);
```

```sql
CREATE INDEX ix_payments_method_history ON public.payments USING btree (method, paid_at DESC, id DESC);
```

```sql
CREATE INDEX ix_payments_receiver_history ON public.payments USING btree (received_by_staff_id, paid_at DESC, id DESC);
```

```sql
CREATE INDEX ix_payments_time ON public.payments USING btree (paid_at);
```

```sql
CREATE UNIQUE INDEX payments_order_id_key ON public.payments USING btree (order_id);
```

```sql
CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id);
```

```sql
CREATE UNIQUE INDEX payments_receipt_no_key ON public.payments USING btree (receipt_no);
```

## 5. Trigger và quy tắc liên bảng

```sql
CREATE CONSTRAINT TRIGGER business_integrity AFTER INSERT OR DELETE OR UPDATE ON payments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_business_integrity();
```

```sql
CREATE TRIGGER immutable_payments BEFORE DELETE OR UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION reject_mutation();
```

```sql
CREATE TRIGGER payment_recipient_guard BEFORE INSERT ON payments FOR EACH ROW EXECUTE FUNCTION guard_payment_recipient();
```

Phần thân và giải thích từng hàm trigger: [TRIGGERS.md](TRIGGERS.md). Trigger `business_integrity` là deferred constraint trigger, kiểm tại commit; không thể suy chỉ từ một INSERT riêng lẻ.

## 6. Vòng đời, lưu ý và giới hạn

- Backend lấy actor từ phiên, khóa/đọc hồ sơ FOR SHARE, lưu username/tên ngay lúc thu. Client không quyết định người nhận hoặc thời điểm.
- CASH có tiền khách đưa; BANK_TRANSFER có nội dung/mã tham chiếu do nhân viên xác nhận; ZERO đóng sổ tổng 0. Không chia bill/hoàn tiền trong MVP.
- INSERT mới bắt buộc snapshot đầy đủ và khớp hồ sơ bằng trigger004. Hai cột nullable chỉ tương thích dữ liệu cũ; không backfill tên theo hồ sơ hiện tại.
- Trigger chặn UPDATE/DELETE payment; deferred integrity buộc order PAID và amount đúng tổng. change_vnd được tính tendered_vnd − amount_vnd, không có cột lưu.

## 7. Cập nhật tài liệu

File được sinh từ catalog metadata và phần giải thích đã review trong `scripts/db_doc_catalog.py`. Khi đổi schema/logic liên quan: thêm migration mới nếu cần, cập nhật catalog giải thích, SSOT và ADR cùng thay đổi; export metadata chỉ đọc rồi sinh lại. Chạy `python scripts/generate_db_docs.py --check` trước commit. Xem [quy trình đồng bộ](README.md#quy-trình-đồng-bộ-bắt-buộc).
