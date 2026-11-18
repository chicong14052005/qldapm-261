# Database và migration của dự án

## 1. Migration hiện tại hoạt động thế nào?

Dự án đã dùng **migration có phiên bản tăng dần**, qua EF Core .NET/Npgsql. Có 5 class migration trong `Backend/Restaurant.Api/Data`; mỗi class có mã `[Migration("...")]` cùng `Up()` và `Down()`. Xem [danh sách và từng bảng](../docs/db/README.md).

`InitialMigration.Up()` đọc `schema.sql` nhúng trong assembly để tạo schema lần đầu. Migration002, 003, 004, 005 thay đổi schema bằng SQL trong `Up()`, không sửa trực tiếp database bằng file schema mỗi lần khởi động. EF ghi bản đã áp dụng vào `__EFMigrationsHistory`; lần sau chỉ chạy các bản còn thiếu theo thứ tự.

Ví dụ DB đã có 001–004 thì chỉ chạy 005; DB mới chạy đủ 001–005. Nếu chỉ sửa `schema.sql` sau khi 001 đã áp dụng, DB hiện tại **không nhận thay đổi đó**, còn DB mới lại nhận, gây lệch môi trường. Vì vậy giữ nguyên các bản đã chạy, thêm migration006 trở đi cho thay đổi mới.

## 2. Có up/down như file migration_v1_up.sql không?

Khái niệm tương đương: `Up()` nâng phiên bản, `Down()` là vị trí để định nghĩa hạ phiên bản. Cách đóng gói hiện tại là C# class chứa SQL thay vì hai file SQL riêng. Không cần tạo thêm bộ SQL up/down song song vì dễ thành hai nguồn migration khác nhau.

**Hiện cả 5 `Down()` đều throw NotSupportedException.** Nghĩa là có upgrade từng bản nhưng chưa hỗ trợ rollback tự động về bản trước. `Down()` không xóa dữ liệu và không phải rollback đã được kiểm thử. Bản MVP dùng migration sửa tiếp theo (forward migration); phục hồi từ backup chỉ thực hiện theo kế hoạch riêng trên đúng môi trường đã được cho phép.

Transaction của một migration thất bại được rollback bởi EF/PostgreSQL khi các lệnh hỗ trợ transaction; việc đó khác với hạ một migration đã chạy thành công. Một chuỗi có thể đã áp dụng được vài bản rồi dừng ở bản sau; cần đọc history và lỗi, không giả định mọi bản được rollback cùng nhau.

## 3. Khi nào dự án chạy migration và seed?

Trong [compose.yml](../compose.yml), service `migrate` dùng image backend và chạy `--migrate`, chờ PostgreSQL healthy. [Program.cs](../Backend/Restaurant.Api/Program.cs) gọi `Database.MigrateAsync()` rồi `Seed.Run(...)` và thoát. Backend được khởi động sau khi job này thành công.

Seed là bước riêng với migration, có thể ghi dữ liệu: bổ sung role/tài khoản demo thiếu, nhóm/món/bàn demo thiếu và khởi tạo ciphertext QR cho bản ghi legacy. Seed bỏ qua các ID/tài khoản đã có, không đặt lại mật khẩu tài khoản đã tồn tại và không xoay QR đã khởi tạo. Nếu chạy job migrate, dù không có migration mới, seed vẫn có thể bổ sung bản ghi thiếu; không xem đây là thao tác chỉ đọc.

Startup backend thông thường không tự chạy migration. Không có `EnsureCreated()` thay thế history. Bản hiện tại chưa có bundle EF riêng, ModelSnapshot, công cụ `dotnet ef` hoặc compose override `backend-dev`. Không sao chép lệnh scaffolding cho project Infrastructure chưa tồn tại từ kế hoạch cũ.

## 4. Cách thêm một migration mới

1. Đọc SSOT liên quan, cập nhật yêu cầu và quyết định ADR trước hoặc cùng code.
2. Thêm class migration mới ở `Backend/Restaurant.Api/Data`, gắn `[DbContext(typeof(AppDb))]` và mã `[Migration]` lớn hơn bản trước; kế thừa `Migration` như các file hiện có. Không đổi ID cũ.
3. Viết SQL thay đổi tối thiểu trong `Up()`, cùng entity/mapping/service. Review tác động dữ liệu cũ, NULL/default/backfill, FK/CHECK/index/trigger, thời gian lock và tương thích API. Hiện dùng `Down()` báo không hỗ trợ; nếu muốn có rollback thật phải thiết kế/test riêng cả schema và dữ liệu trước khi tuyên bố hỗ trợ.
4. Review diff, build/unit phù hợp. Việc test tạo mới/upgrade phải dùng môi trường thử riêng đã được cho phép; không thử lệnh xóa trên DB đang dùng và không thao tác volume/image của dự án khác.
5. Chỉ chạy job nâng cấp khi đó là bước được cho phép của việc triển khai. Trong repo đúng này, lệnh vận hành thường dùng là `docker compose -p restaurant_ordering up -d --build`; lệnh này có thể chạy migration/seed, vì vậy không dùng nó chỉ để đọc schema.
6. Sau upgrade có chủ đích, export metadata chỉ đọc và đồng bộ docs theo mục tiếp theo. Migration lỗi thì giữ dữ liệu/log để xử lý, không reset DB cho qua lỗi.

Hiện migration và API dùng cùng tài khoản PostgreSQL local; chưa tách quyền DDL/DML. Trigger nghiệp vụ không bảo vệ khỏi superuser. Tách quyền là backlog, không phải bảo đảm đã có.

## 5. Đọc và cập nhật tài liệu mà không thay đổi DB

Từ repo root, khi container `postgres` của dự án đang chạy:

```powershell
python scripts/export_db_metadata.py
python scripts/generate_db_docs.py
python scripts/generate_db_docs.py --check
```

Lệnh đầu chỉ đọc catalog/schema trong transaction READ ONLY từ đúng project `restaurant_ordering`; không migrate/seed, không đọc dòng tài khoản/đơn. Hai lệnh sau chỉ xử lý file local, không cần Docker. Trước khi sinh lại phải review giải thích trong `scripts/db_doc_catalog.py`, ADR và SSOT. Khi thêm bảng/cột mà thiếu giải thích, generator báo lỗi.

Không cần chạy export khi chỉ muốn kiểm tra tài liệu đã commit: dùng riêng `--check`. Fingerprint theo dõi nguồn backend, không tự chứng minh ngữ nghĩa và không thay được review. Xem [quy trình đầy đủ](../docs/db/README.md#quy-trình-đồng-bộ-bắt-buộc).

## 6. An toàn dữ liệu và Docker

Tài liệu này không yêu cầu reset, xóa dữ liệu hay xóa images. Giữ nguyên named volumes và keyring. Không dùng thao tác prune toàn máy hoặc xóa volume để sửa lỗi migration. Không kết nối hoặc thay đổi database của dự án khác. Việc xóa dữ liệu dev trong công việc trước là yêu cầu riêng đã thực hiện khi đó, không phải quyền mặc định cho công việc sau này.

Vận hành Docker chi tiết tại [DOCKER.md](DOCKER.md). Backup/restore phải xác định rõ đúng database, đích phục hồi và keyring; chưa có restore drill được chứng minh ở bản hiện tại.
