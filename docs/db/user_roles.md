# `user_roles` — Gán vai trò cho nhân viên

Đối chiếu schema: `202611180005_SingleActiveGuestPerVisit` · review 03/11/2026. [Danh mục DB](README.md) · [ADR-0003](../../ADR/0003-database.md).

## 1. Vai trò và phạm vi

Bảng nối nhiều–nhiều giữa staff_users và roles, lưu thời điểm và người cấp quyền. Không có cột id vì cặp user_id/role_code đã định danh duy nhất.

Quy tắc nghiệp vụ: [P1.1](../../SSOT/P1.1-tai-khoan-va-phan-quyen.md).

## 2. Các trường

Kiểu, NULL và DEFAULT dưới đây là **định nghĩa tại PostgreSQL**, không phải giá trị mặc định của C#. “Không có” nghĩa là DB không tự cấp giá trị; backend có thể cấp khi tạo entity. PK/UQ/FK/CHECK được ghi đầy đủ ở mục 3.

| Trường | Kiểu PostgreSQL | Cho NULL | DEFAULT tại DB | Ý nghĩa và cách sử dụng |
|---|---|---|---|---|
| `user_id` | `uuid` | Không | Không có | Nhân viên được cấp quyền; thành phần khóa chính và FK RESTRICT đến staff_users.id. |
| `role_code` | `character varying(16)` | Không | Không có | Role được cấp; thành phần khóa chính và FK RESTRICT đến roles.code. Cùng user không được nhận trùng role. |
| `granted_at` | `timestamp with time zone` | Không | Không có | Thời điểm cấp. Entity mặc định UTC hiện tại; DB không tự sinh thời điểm. |
| `granted_by_staff_id` | `uuid` | Có | Không có | Nhân viên thực hiện cấp quyền. NULL hợp lệ cho seed hệ thống; có giá trị thì phải trỏ tài khoản còn lưu trong staff_users. |

## 3. Khóa, quan hệ và ràng buộc tại DB

Các định nghĩa sau lấy từ PostgreSQL catalog sau khi áp dụng đủ chuỗi migration đã ghi ở đầu file. FK `RESTRICT` ngăn xóa bản ghi đang được tham chiếu; không có cascade xóa nghiệp vụ. CHECK không thay cho phân quyền và validation ở service.

Tham chiếu tới: [roles](roles.md), [staff_users](staff_users.md).

### `user_roles_granted_by_staff_id_fkey`

```sql
FOREIGN KEY (granted_by_staff_id) REFERENCES staff_users(id) ON DELETE RESTRICT
```

### `user_roles_pkey`

```sql
PRIMARY KEY (user_id, role_code)
```

### `user_roles_role_code_fkey`

```sql
FOREIGN KEY (role_code) REFERENCES roles(code) ON DELETE RESTRICT
```

### `user_roles_user_id_fkey`

```sql
FOREIGN KEY (user_id) REFERENCES staff_users(id) ON DELETE RESTRICT
```

## 4. Index và đường truy vấn

Danh sách gồm cả index tự sinh bởi PRIMARY KEY/UNIQUE; không tạo thêm bản trùng. Partial index chỉ áp dụng các dòng khớp WHERE.

```sql
CREATE INDEX ix_roles_user ON public.user_roles USING btree (role_code, user_id);
```

```sql
CREATE INDEX ix_user_roles_granter ON public.user_roles USING btree (granted_by_staff_id);
```

```sql
CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (user_id, role_code);
```

## 5. Trigger và quy tắc liên bảng

Không có user-defined trigger trên bảng này. Các FK/CHECK ở trên vẫn được PostgreSQL thực thi.

## 6. Vòng đời, lưu ý và giới hạn

- Admin sửa tập role qua service; seed có thể gán role không có người cấp cụ thể. Hai FK của khóa chính đều NOT NULL do PRIMARY KEY.
- Thay role có thể xóa/thêm dòng nối; audit lưu hành động. Kiểm ADMIN cuối cùng và thu hồi phiên là trách nhiệm service.

## 7. Cập nhật tài liệu

File được sinh từ catalog metadata và phần giải thích đã review trong `scripts/db_doc_catalog.py`. Khi đổi schema/logic liên quan: thêm migration mới nếu cần, cập nhật catalog giải thích, SSOT và ADR cùng thay đổi; export metadata chỉ đọc rồi sinh lại. Chạy `python scripts/generate_db_docs.py --check` trước commit. Xem [quy trình đồng bộ](README.md#quy-trình-đồng-bộ-bắt-buộc).
