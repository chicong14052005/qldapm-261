# `roles` — Danh mục vai trò nhân viên

Đối chiếu schema: `202611180005_SingleActiveGuestPerVisit` · review 03/11/2026. [Danh mục DB](README.md) · [ADR-0003](../../ADR/0003-database.md).

## 1. Vai trò và phạm vi

Năm role được hỗ trợ cho phân quyền nội bộ. Đây là danh mục mã quyền, không phải danh sách permission tùy biến và không chứa CUSTOMER.

Quy tắc nghiệp vụ: [P1.1](../../SSOT/P1.1-tai-khoan-va-phan-quyen.md).

## 2. Các trường

Kiểu, NULL và DEFAULT dưới đây là **định nghĩa tại PostgreSQL**, không phải giá trị mặc định của C#. “Không có” nghĩa là DB không tự cấp giá trị; backend có thể cấp khi tạo entity. PK/UQ/FK/CHECK được ghi đầy đủ ở mục 3.

| Trường | Kiểu PostgreSQL | Cho NULL | DEFAULT tại DB | Ý nghĩa và cách sử dụng |
|---|---|---|---|---|
| `code` | `character varying(16)` | Không | Không có | Khóa chính dạng mã: WAITER, KITCHEN, CASHIER, MANAGER, ADMIN. CHECK giới hạn đúng năm giá trị; không dùng UUID. |
| `display_name` | `character varying(80)` | Không | Không có | Nhãn tiếng Việt của role. DB NOT NULL và tối đa 80 ký tự; hiện không có CHECK chống chuỗi trắng tại DB. |

## 3. Khóa, quan hệ và ràng buộc tại DB

Các định nghĩa sau lấy từ PostgreSQL catalog sau khi áp dụng đủ chuỗi migration đã ghi ở đầu file. FK `RESTRICT` ngăn xóa bản ghi đang được tham chiếu; không có cascade xóa nghiệp vụ. CHECK không thay cho phân quyền và validation ở service.

Được tham chiếu bởi: [user_roles](user_roles.md).

### `roles_code_check`

```sql
CHECK (code::text = ANY (ARRAY['WAITER'::character varying, 'KITCHEN'::character varying, 'CASHIER'::character varying, 'MANAGER'::character varying, 'ADMIN'::character varying]::text[]))
```

### `roles_pkey`

```sql
PRIMARY KEY (code)
```

## 4. Index và đường truy vấn

Danh sách gồm cả index tự sinh bởi PRIMARY KEY/UNIQUE; không tạo thêm bản trùng. Partial index chỉ áp dụng các dòng khớp WHERE.

```sql
CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (code);
```

## 5. Trigger và quy tắc liên bảng

Không có user-defined trigger trên bảng này. Các FK/CHECK ở trên vẫn được PostgreSQL thực thi.

## 6. Vòng đời, lưu ý và giới hạn

- Seed bổ sung role thiếu. Quyền của từng endpoint do Require(...) trong backend xác định; display_name chỉ để hiển thị.
- Không suy MANAGER tự có quyền ADMIN. Một user có nhiều role bằng nhiều dòng user_roles.

## 7. Cập nhật tài liệu

File được sinh từ catalog metadata và phần giải thích đã review trong `scripts/db_doc_catalog.py`. Khi đổi schema/logic liên quan: thêm migration mới nếu cần, cập nhật catalog giải thích, SSOT và ADR cùng thay đổi; export metadata chỉ đọc rồi sinh lại. Chạy `python scripts/generate_db_docs.py --check` trước commit. Xem [quy trình đồng bộ](README.md#quy-trình-đồng-bộ-bắt-buộc).
