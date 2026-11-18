# ADR-0004 — Docker, migration và dữ liệu bền vững

03/11/2026 · Mô tả triển khai hiện hành. Thay phần kế hoạch bundle/ModelSnapshot/compose override chưa được thực hiện trong baseline cũ. Các quyết định MVP tại [ADR-0008](0008-mvp-local-va-quyet-dinh-trien-khai.md), QR tại [ADR-0009](0009-qr-co-dinh-tai-ban.md).

## 1. Runtime Docker thực tế

Build/chạy dự án trong Docker Compose; host không cần SDK .NET/Node để chạy ứng dụng. [compose.yml](../compose.yml) có project mặc định `restaurant_ordering`, PostgreSQL 16 Alpine, backend .NET 10, frontend Next.js/Node 24 và gateway Caddy.

| Service  | Chức năng / phụ thuộc hiện tại                                                                      |
| -------- | --------------------------------------------------------------------------------------------------- |
| postgres | `postgres:16-alpine`, restart unless-stopped, healthcheck pg_isready, volume postgres_data          |
| migrate  | Build runtime backend, chạy `--migrate`, đợi postgres healthy, restart no; mount auth_keys          |
| backend  | ASP.NET runtime; đợi migrate kết thúc thành công, mount auth_keys; hiện chưa khai báo user non-root |
| frontend | Next standalone, user node, đợi backend running; chưa có healthcheck Compose riêng                  |
| gateway  | Caddy route API/backend và web/frontend, bind `127.0.0.1:${PORT:-3000}:80`; không HTTPS local       |

Backend dùng hostname `postgres`, browser dùng gateway. DB không public port mặc định. Image tags như file Compose/Dockerfile hiện tại, chưa pin toàn bộ bằng digest. Không có `compose.dev.yml`, `compose.test.yml`, backend-dev hay Infrastructure project trong bản hiện tại.

## 2. Migration có phiên bản

Chọn **EF Core SQL-first migrations**: class `[Migration]` chứa SQL trong `Up()`, EF history ghi mỗi bản đã áp dụng. InitialMigration đọc SQL resource `schema.sql`; các migration sau ALTER/add trigger/index. Có 5 bản thực tế (001–005), xem [danh sách](../docs/db/README.md#chuỗi-migration-thực-tế).

Không sửa SQL của migration đã áp dụng. EF không checksum lại nội dung cũ: sửa schema.sql sẽ khiến DB mới và DB đã có khác nhau. Thay đổi schema phải là migration tiếp theo, cùng entity/mapping/service tương ứng.

**Hiện cả 5 `Down()` đều throw NotSupportedException.** Nghĩa là có upgrade từng bản nhưng chưa hỗ trợ rollback tự động về bản trước. `Down()` không xóa dữ liệu và không phải rollback đã được kiểm thử. Dùng forward migration được review; phục hồi backup cần kế hoạch riêng. Không quảng bá lệnh downgrade như tính năng chạy được. Transaction rollback khi migration đang chạy lỗi là chuyện khác với hạ phiên bản đã hoàn tất.

Không có EF ModelSnapshot, design-time factory, dotnet-ef tool manifest hoặc bundle EF trong codebase hiện hành. Vì dùng SQL thủ công cho CHECK/trigger/partial index, chưa tự scaffold schema từ model. Không thêm bộ migration_vN_up/down song song làm nguồn thực thi thứ hai.

## 3. Cách job được thực hiện

`Program.cs` khi nhận `--migrate` gọi `Database.MigrateAsync()`, rồi `Seed.Run(...)`, ghi kết quả và thoát. Backend bình thường không tự migrate trong startup. Migration fail ngăn backend mới qua điều kiện depends_on; nếu seed fail sau migration đã commit thì schema có thể đã nâng dù job fail, cần đọc history/log và xử lý đúng lỗi.

Seed có transaction/advisory lock riêng; bổ sung role/user/menu/bàn demo thiếu, khởi tạo ciphertext QR cho bản legacy. Không đặt lại mật khẩu tài khoản đã có và không xoay QR đã khởi tạo. Chạy job **có thể ghi dữ liệu ngay cả khi không có migration mới**, nên không dùng job để chỉ xem schema.

MVP dùng cùng connection/user cho migration và API; tách DDL/DML là backlog. Chưa có deployment orchestrator ngăn nhiều job bên ngoài chạy đồng thời; không khẳng định khóa của seed thay thế khóa triển khai migration. Vận hành một job nâng cấp cho mỗi đích theo kế hoạch.

## 4. Cấu hình và lưu trữ

`.env.example` công bố tên biến/mặc định local, `.env` bị gitignore. Compose có fallback nên có thể chạy khi chưa có `.env`; khi tạo `.env`, các giá trị được dùng ở lần Compose dựng/recreate thích hợp. Không commit hoặc log secret từ `.env`.

- `postgres_data` lưu toàn bộ database; restart/recreate container không mặc định xóa volume.
- `auth_keys` lưu keyring ASP.NET Data Protection, cần cho QR ciphertext và replay response. Mất keyring không thể khôi phục bằng việc chỉ còn DB.
- PostgreSQL image init chỉ tạo cluster/user/db ở lần volume trống. Đổi POSTGRES_PASSWORD trong env không tự đổi mật khẩu role trên cluster đã tồn tại.
- Backend còn dùng tài khoản DB local có quyền cao; đây không phải cấu hình production đã harden. Không có TLS/secrets manager/metrics/restore drill được chứng minh trong bản này.

## 5. Quy trình thay đổi và tài liệu

1. Sửa yêu cầu ở SSOT và quyết định ở ADR khi có thay đổi được chấp thuận.
2. Thêm migration tiếp theo, review tương thích dữ liệu/NULL/backfill/constraints và thời gian lock; không reset để bỏ qua lỗi.
3. Build/test phù hợp; tạo mới và upgrade chỉ trên môi trường thử riêng được cho phép.
4. Sau nâng cấp có chủ đích, đọc schema bằng `scripts/export_db_metadata.py`; script chỉ READ ONLY catalog trong đúng Compose project, không migration/seed hoặc query dữ liệu nghiệp vụ.
5. Review/sinh [docs/db](../docs/db/README.md), cập nhật [ADR-0003](0003-database.md), ADR/SSOT/API/GUIDE liên quan, chạy `python scripts/generate_db_docs.py --check`, commit cùng feature. Quy trình [ADR-0011](0011-dong-bo-tai-lieu-database.md).

Hướng dẫn cụ thể theo code hiện tại ở [DATABASE-MIGRATIONS.md](../GUIDE/DATABASE-MIGRATIONS.md). Các lệnh đọc metadata không cần khởi động/chạy lại migrate.

## 6. Dữ liệu an toàn

Theo yêu cầu chủ dự án, không xóa Docker images, không xóa dữ liệu/volume và không đụng database của dự án khác. Không dùng prune toàn máy hoặc volume reset để xử lý lỗi. Chỉ làm trên đúng checkout/Compose project được chỉ định. Hướng dẫn [DOCKER.md](../GUIDE/DOCKER.md) có cách dừng/chạy lại và dựng môi trường riêng mà giữ tài sản cũ.

Backup/restore cần cả DB và keyring, xác định rõ nguồn/đích và quyền trước khi làm. Chưa có bằng chứng restore drill; không tuyên bố khôi phục đã được kiểm thử. Yêu cầu dọn dữ liệu dev trong công việc trước chỉ có hiệu lực cho thao tác được yêu cầu khi đó, không phải quyền xóa mặc định.
