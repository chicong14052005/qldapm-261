# `staff_sessions` — Phiên đăng nhập nhân viên

Đối chiếu schema: `202611180005_SingleActiveGuestPerVisit` · review 03/11/2026. [Danh mục DB](README.md) · [ADR-0003](../../ADR/0003-database.md).

## 1. Vai trò và phạm vi

Lưu phiên đăng nhập để cookie có thể bị thu hồi. Cookie mang token ngẫu nhiên; DB chỉ lưu SHA-256 của token để tra phiên.

Quy tắc nghiệp vụ: [P1.1](../../SSOT/P1.1-tai-khoan-va-phan-quyen.md).

## 2. Các trường

Kiểu, NULL và DEFAULT dưới đây là **định nghĩa tại PostgreSQL**, không phải giá trị mặc định của C#. “Không có” nghĩa là DB không tự cấp giá trị; backend có thể cấp khi tạo entity. PK/UQ/FK/CHECK được ghi đầy đủ ở mục 3.

| Trường | Kiểu PostgreSQL | Cho NULL | DEFAULT tại DB | Ý nghĩa và cách sử dụng |
|---|---|---|---|---|
| `id` | `uuid` | Không | Không có | Định danh UUID của bản ghi, khóa chính. Ứng dụng sinh Guid.NewGuid(); seed có thể dùng UUID cố định. Không có DEFAULT UUID tại DB. |
| `user_id` | `uuid` | Không | Không có | Chủ phiên, FK RESTRICT đến staff_users.id. Một tài khoản có thể có nhiều phiên. |
| `token_hash` | `bytea` | Không | Không có | Hash SHA-256 dài đúng 32 byte, UNIQUE. Không phải token rõ, mật khẩu hoặc ciphertext có thể giải mã. |
| `created_at` | `timestamp with time zone` | Không | Không có | Thời điểm cấp phiên, entity gán UTC; DB không có DEFAULT. |
| `expires_at` | `timestamp with time zone` | Không | Không có | Hạn sử dụng tuyệt đối, phải sau created_at. Backend tạo hạn 8 giờ; CHECK chỉ kiểm thứ tự thời gian, không buộc đúng 8 giờ. |
| `revoked_at` | `timestamp with time zone` | Có | Không có | NULL khi chưa thu hồi; nếu có phải không trước created_at. Phiên chỉ hợp lệ khi chưa thu hồi và chưa hết hạn. |

## 3. Khóa, quan hệ và ràng buộc tại DB

Các định nghĩa sau lấy từ PostgreSQL catalog sau khi áp dụng đủ chuỗi migration đã ghi ở đầu file. FK `RESTRICT` ngăn xóa bản ghi đang được tham chiếu; không có cascade xóa nghiệp vụ. CHECK không thay cho phân quyền và validation ở service.

Tham chiếu tới: [staff_users](staff_users.md).

### `staff_sessions_check`

```sql
CHECK (expires_at > created_at)
```

### `staff_sessions_check1`

```sql
CHECK (revoked_at >= created_at)
```

### `staff_sessions_pkey`

```sql
PRIMARY KEY (id)
```

### `staff_sessions_token_hash_check`

```sql
CHECK (octet_length(token_hash) = 32)
```

### `staff_sessions_token_hash_key`

```sql
UNIQUE (token_hash)
```

### `staff_sessions_user_id_fkey`

```sql
FOREIGN KEY (user_id) REFERENCES staff_users(id) ON DELETE RESTRICT
```

## 4. Index và đường truy vấn

Danh sách gồm cả index tự sinh bởi PRIMARY KEY/UNIQUE; không tạo thêm bản trùng. Partial index chỉ áp dụng các dòng khớp WHERE.

```sql
CREATE INDEX ix_sessions_user ON public.staff_sessions USING btree (user_id);
```

```sql
CREATE UNIQUE INDEX staff_sessions_pkey ON public.staff_sessions USING btree (id);
```

```sql
CREATE UNIQUE INDEX staff_sessions_token_hash_key ON public.staff_sessions USING btree (token_hash);
```

## 5. Trigger và quy tắc liên bảng

Không có user-defined trigger trên bảng này. Các FK/CHECK ở trên vẫn được PostgreSQL thực thi.

## 6. Vòng đời, lưu ý và giới hạn

- Login tạo phiên hết hạn sau 8 giờ theo service hiện tại. Logout/đổi mật khẩu/khóa/đổi quyền ghi revoked_at, không xóa tài khoản.
- Quyền không được snapshot trong phiên: mỗi request đọc tài khoản active và role hiện tại. Không đưa token_hash vào response/log.

## 7. Cập nhật tài liệu

File được sinh từ catalog metadata và phần giải thích đã review trong `scripts/db_doc_catalog.py`. Khi đổi schema/logic liên quan: thêm migration mới nếu cần, cập nhật catalog giải thích, SSOT và ADR cùng thay đổi; export metadata chỉ đọc rồi sinh lại. Chạy `python scripts/generate_db_docs.py --check` trước commit. Xem [quy trình đồng bộ](README.md#quy-trình-đồng-bộ-bắt-buộc).
