# `__EFMigrationsHistory` — Lịch sử phiên bản EF Core

Đối chiếu schema: `202611180005_SingleActiveGuestPerVisit` · review 03/11/2026. [Danh mục DB](README.md) · [ADR-0003](../../ADR/0003-database.md).

## 1. Vai trò và phạm vi

Bảng hạ tầng do EF Core quản lý để biết migration nào đã áp dụng. Không phải bảng nghiệp vụ và không chứa lịch sử thanh toán hay lịch sử sửa từng dòng.

## 2. Các trường

Kiểu, NULL và DEFAULT dưới đây là **định nghĩa tại PostgreSQL**, không phải giá trị mặc định của C#. “Không có” nghĩa là DB không tự cấp giá trị; backend có thể cấp khi tạo entity. PK/UQ/FK/CHECK được ghi đầy đủ ở mục 3.

| Trường | Kiểu PostgreSQL | Cho NULL | DEFAULT tại DB | Ý nghĩa và cách sử dụng |
|---|---|---|---|---|
| `MigrationId` | `character varying(150)` | Không | Không có | Khóa chính, mã migration EF đầy đủ gồm tiền tố thời gian và tên; ví dụ 202611030004_PaymentRecipientHistory. Tên cột giữ nguyên PascalCase vì EF quản lý. |
| `ProductVersion` | `character varying(32)` | Không | Không có | Phiên bản EF Core đã ghi migration lúc áp dụng, không phải phiên bản PostgreSQL, .NET hoặc phiên bản dữ liệu ứng dụng. Không có DEFAULT tại DB. |

## 3. Khóa, quan hệ và ràng buộc tại DB

Các định nghĩa sau lấy từ PostgreSQL catalog sau khi áp dụng đủ chuỗi migration đã ghi ở đầu file. FK `RESTRICT` ngăn xóa bản ghi đang được tham chiếu; không có cascade xóa nghiệp vụ. CHECK không thay cho phân quyền và validation ở service.

### `PK___EFMigrationsHistory`

```sql
PRIMARY KEY ("MigrationId")
```

## 4. Index và đường truy vấn

Danh sách gồm cả index tự sinh bởi PRIMARY KEY/UNIQUE; không tạo thêm bản trùng. Partial index chỉ áp dụng các dòng khớp WHERE.

```sql
CREATE UNIQUE INDEX "PK___EFMigrationsHistory" ON public."__EFMigrationsHistory" USING btree ("MigrationId");
```

## 5. Trigger và quy tắc liên bảng

Không có user-defined trigger trên bảng này. Các FK/CHECK ở trên vẫn được PostgreSQL thực thi.

## 6. Vòng đời, lưu ý và giới hạn

- Database.MigrateAsync() đọc bảng này rồi chạy Up() của các bản còn thiếu theo thứ tự. Không chỉnh/xóa dòng bằng tay để ép chạy lại migration.
- Không dùng bảng này làm checksum nguồn: EF không tự phát hiện bạn sửa SQL của một migration đã chạy. Bản đã áp dụng phải giữ nguyên, thay đổi bằng migration mới.
- Bốn bản hiện hành được liệt kê tại README thư mục này. Down() hiện chủ động throw, không hỗ trợ rollback tự động.

## 7. Cập nhật tài liệu

File được sinh từ catalog metadata và phần giải thích đã review trong `scripts/db_doc_catalog.py`. Khi đổi schema/logic liên quan: thêm migration mới nếu cần, cập nhật catalog giải thích, SSOT và ADR cùng thay đổi; export metadata chỉ đọc rồi sinh lại. Chạy `python scripts/generate_db_docs.py --check` trước commit. Xem [quy trình đồng bộ](README.md#quy-trình-đồng-bộ-bắt-buộc).
