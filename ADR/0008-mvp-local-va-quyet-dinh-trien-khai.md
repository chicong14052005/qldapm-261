# ADR-0008 — MVP localhost và triển khai thực tế

> Thay đổi QR hiện hành03/11/2026: [ADR-0009](0009-qr-co-dinh-tai-ban.md) thay mã tham gia bằng QR cố định. Những đoạn mô tả joinCode/HMAC/QR chỉ có link bên dưới là lịch sử quyết định trước; xem P1.3 và API docs cho hành vi mới.

02/11/2026 · **Đã triển khai MVP local**. Thay thế các lựa chọn khác biệt trong ADR-0001/0002/0004/0006; nghiệp vụ vẫn thuộc SSOT.

## Xác nhận mới từ chủ dự án

| Mục | Quyết định                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------- |
| 1A  | Đợt đầu tự APPROVED; mọi đợt sau cần duyệt                                                                                  |
| 2B  | KITCHEN/MANAGER/ADMIN duyệt; MANAGER/ADMIN được tự duyệt đợt mình gửi, KITCHEN không tự duyệt                               |
| 3A  | Tại bàn và mang về thu tiền sau chế biến/bàn giao                                                                           |
| 4A  | Một dòng cùng trạng thái cho toàn quantity; trước nấu được giảm quantity/note; sau nấu manager/admin hủy toàn dòng có lý do |
| 5A  | Admin tạo tài khoản nhân viên; khách tại bàn không tài khoản; takeaway do nhân viên/thu ngân nhập                           |
| 6B  | Chạy PC localhost; xem responsive bằng Device Toolbar; chưa triển khai LAN/Internet                                         |
| 7A  | Agent triển khai toàn dự án theo chặng và đồng bộ tài liệu                                                                  |
| 8   | Ưu tiên chạy sớm; unit test và Markdown từng API có payload, có thể tự thử HTTP                                             |

## Cách thực hiện

ASP.NET Core .NET10, Npgsql EF provider10.0.0, Next.js16.4.4, React19.3.1, TypeScript5.9.3, PostgreSQL16 Alpine, Node24 Alpine, Caddy2. Backend một project `Backend/Restaurant.Api` chia Domain/Data/Services thay bốn assembly dự kiến. Các nhóm use case Accounts/MenuAndVisits/Ordering/Billing dùng chung transaction, policy và audit. Có project unit test riêng.

Frontend CSS riêng và React hooks, chưa thêm Tailwind/TanStack Query/React Hook Form/Zod để giảm thời gian dựng. `RestaurantApp.tsx` chứa UI theo vai trò, `lib/api.ts` chứa transport/CSRF/errors/key. Backend vẫn kiểm quyền/validation độc lập.

## Migration thực tế

**SQL-first EF migrations**: InitialMigration đọc embedded `Data/schema.sql`; IntegrityMigration thêm defaults/index/guards. Job migrate gọi `Database.MigrateAsync()` và seed idempotent; API không tự migrate. Không EnsureCreated, không sửa migration đã áp dụng.

Hiện **không có model snapshot/code-first diff generator**. Không chạy `dotnet ef migrations add` theo quy trình dự kiến cũ. Thay schema: tạo class kế thừa Migration, gắn DbContext/Migration ID mới, viết Up SQL, cập nhật mapping và ADR-0003 cùng PR. CHECK/trigger không được EF tự phát hiện. Review SQL và chạy migration trên DB sạch/DB hiện có; chuyển sang code-first generator sau này cần snapshot đúng schema. Đây là thay đổi cách thực hiện, vẫn hỗ trợ migration có history và thứ tự áp dụng.

## Vận hành và giới hạn bản local

Gateway bind **127.0.0.1:3000**, DB publish port (5433:5432). Named volumes giữ dữ liệu/keyring. Credentials trong `.env.example`/Compose là demo có chủ ý. Migrate/backend hiện dùng cùng DB user local; chưa tách DDL/DML role như đề xuất ADR-0004. Payment/audit có append-only trigger nhưng DB superuser vẫn quản trị được. Backend chưa non-root, frontend dùng user node. Khi triển khai Internet phải bổ sung DB roles/secrets, HTTPS/cookie Secure và hardening; không coi Compose demo là cấu hình production.

53 endpoint có từng Markdown, Postman collection và OpenAPI. Catalog transport được đối chiếu route Program.cs bởi `scripts/generate_api_docs.py`; không thay SSOT nghiệp vụ. Queue bếp/phục vụ trả toàn bộ món active; order list tối đa200 đơn gần nhất; chưa cursor paging/filter KDS. Danh mục có API sửa/ẩn, UI mới có tạo; ảnh là placeholder hoặc HTTPS, chưa upload. QR dùng link `/qr/{token}`, chưa tự in ảnh QR, đủ cho demo browser localhost.

Login rate limit10/phút/IP, join5/phút/IP; chưa chia theo username/lượt như đề xuất cũ. Antiforgery ASP.NET và Origin validation đã có. Replay24h, record mã hóa bằng Data Protection keyring trong volume; chưa job cleanup ciphertext. Frontend giữ key cho request chưa rõ kết quả trong bộ nhớ, refresh phải tra đơn; chưa sessionStorage recovery. Cookie staff chia sẻ giữa tab cùng profile; dùng profile/ẩn danh khác để thử đồng thời nhiều tài khoản.

Đã build backend và frontend production/typecheck; 13 unit test trọng điểm đạt, HTTP smoke có kết quả tại `docs/verification/smoke-result.json`. Chưa benchmark50 thiết bị, UAT5 người, restore drill hoặc concurrency stress đầy đủ. Các hạng mục đó là bước sau MVP theo ưu tiên mới, không ghi nhận đã đạt từ unit/smoke.
