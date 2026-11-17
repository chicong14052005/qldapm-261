# Hệ thống quản lý đặt món nhà hàng

CO3011 · Nhóm 5 · Baseline tài liệu ngày **02/11/2026**.

**Trạng thái:** đã triển khai MVP local, chạy bằng Docker Compose. `Backend/` và `Frontend/` giữ nguyên ranh giới. [Trạng thái thực hiện](docs/IMPLEMENTATION-STATUS.md) · [Quyết định/giới hạn thực tế](ADR/0008-mvp-local-va-quyet-dinh-trien-khai.md).

## Chạy và thử ngay

[Hướng dẫn Docker đầy đủ: lần đầu, chạy lại, dừng, dựng môi trường sạch mà giữ image/dữ liệu cũ](GUIDE/DOCKER.md) · [Danh mục GUIDE và tips](GUIDE/README.md).

Mở Docker Desktop (Linux containers), tại repo chạy:

1. Nếu đang trong giai đoạn phát triển (development) thì chạy:

```PowerShell
# Override chạy chế độ Development cho Frontend (có Next.js Dev Indicator & Hot Reload)
docker compose -f compose.yml -f compose.dev.yml up -d --build
```

2. Khi đã hoàn thiện sản phẩm và chạy demo thì chạy:

```powershell
# Khi hoàn thiện sản phẩm / nộp bài (Production):
docker compose up -d --build
```

Mở **[http://localhost:3000](http://localhost:3000)**. Compose chờ DB, tự áp dụng migration và seed30 bàn/20 món/5 tài khoản. Không cần SDK10 hoặc npm host.

| Username | Vai trò                           | Password local mặc định |
| -------- | --------------------------------- | ----------------------- |
| admin    | Admin, có quyền nghiệp vụ quản lý | RestaurantDemo!2026     |
| manager  | Quản lý                           | RestaurantDemo!2026     |
| waiter   | Phục vụ                           | RestaurantDemo!2026     |
| kitchen  | Bếp                               | RestaurantDemo!2026     |
| cashier  | Thu ngân                          | RestaurantDemo!2026     |

Có thể copy `.env.example` thành `.env` trước seed đầu để đổi cấu hình. Seed chạy lại **không reset** tài khoản/giá/món đã sửa. Gateway chỉ bind127.0.0.1, DB publish host port (5433:5432); đây là cấu hình demo local.

1. Admin/waiter mở lượt trên bàn. Bấm **Xem QR & link** để xem ảnh QR cố định, URL gốc, sao chép hoặc tải PNG.
2. Mở link trong cửa sổ ẩn danh là vào menu đúng bàn/lượt, không nhập mã. QR dùng lại qua các lượt; chưa mở lượt thì trang báo liên hệ nhân viên. [Hướng dẫn QR](GUIDE/QR-TAI-BAN.md).
3. Gửi món lần đầu → bếp; gọi thêm → chờ duyệt. Kitchen/manager/admin duyệt. Manager/admin được tự duyệt.
4. KDS: Tiếp nhận → Bắt đầu nấu → Hoàn thành. Phục vụ: xác nhận Đã phục vụ.
5. Chi tiết đơn: Yêu cầu thanh toán → cashier xác nhận tiền mặt/chuyển khoản → receipt, đóng lượt, bàn trống.
6. Takeaway từ nút Đơn mang về, không bàn; chế biến/bàn giao trước thu tiền. Món đã nấu hủy ngoại lệ cần manager/admin và lý do; toàn món hủy có thể đóng sổ ZERO tổng0.

Các tab thường cùng profile chia sẻ cookie; muốn nhiều tài khoản staff đồng thời dùng profile/browser/ẩn danh riêng. F12 → **Ctrl+Shift+M** để xem mobile/tablet bằng Device Toolbar ngay trên localhost.

## API và kiểm thử

- [55 tài liệu API — mỗi endpoint một Markdown](docs/api/README.md).
- [Hướng dẫn Postman, cookie/CSRF/version và các luồng mẫu](docs/api/POSTMAN.md).
- [Import Postman collection](docs/api/restaurant.postman_collection.json).
- [OpenAPI đang chạy](http://localhost:3000/api/v1/openapi.json).

```powershell
docker build --target tests -t restaurant-ordering-tests ./Backend
python scripts/smoke.py
python scripts/qr_smoke.py
```

Unit test chạy trong Docker. Smoke dùng Python standard library, không cần pip; tạo dữ liệu demo có thanh toán/hủy, không xóa dữ liệu. [Kết quả HTTP thực tế](docs/verification/smoke-result.json). Để chạy smoke hoàn toàn trong container:

```powershell
docker run --rm --network restaurant_ordering_default -e BASE_URL=http://gateway -v "${PWD}:/workspace" -w /workspace python:3.12-alpine python scripts/smoke.py
python scripts/qr_smoke.py
```

Sinh lại docs/collection/OpenAPI khi đổi route: `python scripts/generate_api_docs.py`. Script kiểm catalog khớp55 route thực. Frontend unit test copy URL: `docker build --target tests -t restaurant-ordering-frontend-tests ./Frontend`. Dừng bằng `docker compose stop`, khởi động lại `docker compose start`, cập nhật code bằng `docker compose up -d --build`. Named volumes giữ DB/keyring; không dùng `down -v` nếu muốn giữ dữ liệu.

Backend thực tế: `Restaurant.Api/{Domain,Data,Services}` + `Restaurant.Tests`. Frontend: Next app routes, component UI chung và API helper. Chưa benchmark50 thiết bị/UAT5 người/restore drill; xem ADR-0008 trước khi triển khai ngoài localhost.

## Bắt đầu đọc

1. [Danh mục SSOT và quy trình đồng bộ](SSOT/README.md).
2. [Quyết định stack và khảo sát máy](ADR/0001-tech-stack.md).
3. [Kiến trúc và cấu trúc dự án](ADR/0002-kien-truc-va-cau-truc.md).
4. [Thiết kế database, từ điển dữ liệu và ràng buộc](ADR/0003-database.md).
5. [Migration và Docker Compose dự kiến](ADR/0004-docker-va-migration.md).
6. [API, bảo mật và xử lý đồng thời](ADR/0005-api-va-nhat-quan.md).
7. [Lộ trình, task và acceptance criteria](ADR/0006-implementation-plan.md).
8. [Nguồn yêu cầu, mâu thuẫn và xác nhận](ADR/0007-truy-vet-va-xac-nhan.md).

## Phân hệ

| Mã   | Đặc tả duy nhất                                                       | Phạm vi         |
| ---- | --------------------------------------------------------------------- | --------------- |
| P1.1 | [Tài khoản và phân quyền](SSOT/P1.1-tai-khoan-va-phan-quyen.md)       | S1              |
| P1.2 | [Thực đơn và tình trạng món](SSOT/P1.2-thuc-don-va-tinh-trang-mon.md) | S2, S9          |
| P1.3 | [Bàn và lượt khách](SSOT/P1.3-ban-va-luot-khach.md)                   | S3              |
| P1.4 | [Đặt món và điều chỉnh đơn](SSOT/P1.4-dat-mon-va-dieu-chinh-don.md)   | S4, S5, S8, S11 |
| P1.5 | [Xử lý món tại bếp](SSOT/P1.5-xu-ly-mon-tai-bep.md)                   | S6              |
| P1.6 | [Theo dõi và xác nhận phục vụ](SSOT/P1.6-theo-doi-va-phuc-vu.md)      | S7, bàn giao S5 |
| P1.7 | [Thanh toán và hoàn tất đơn](SSOT/P1.7-thanh-toan-va-hoan-tat.md)     | S10             |

Stack lựa chọn: **C# / ASP.NET Core .NET 10 + EF Core/Npgsql + PostgreSQL 16; React / Next.js App Router / TypeScript; Docker Compose cho toàn bộ môi trường**. Chi tiết lý do và giới hạn bằng chứng nằm trong ADR-0001.

`temp-docs/` là đầu vào lịch sử, không phải đặc tả đang có hiệu lực. Không tạo bản mô tả phân hệ thứ hai ngoài SSOT. ADR ghi cách thực hiện và lý do; quy tắc nghiệp vụ được sở hữu bởi từng SSOT.

Admin có [lịch sử thanh toán](GUIDE/LICH-SU-THANH-TOAN.md) để tra cứu toàn bộ đơn đã chốt, thời điểm và người thu. Smoke riêng: `python scripts/payment_history_smoke.py`.

## Database và đồng bộ tài liệu

- [16 bảng — mỗi bảng một tài liệu, đầy đủ 144 trường](docs/db/README.md).
- [Migration tăng dần và ý nghĩa Up/Down hiện tại](GUIDE/DATABASE-MIGRATIONS.md): 4 bản EF SQL-first, Down chưa hỗ trợ tự động; không sửa migration đã áp dụng.
- [Quyết định cấu trúc](ADR/0003-database.md), [Docker/migration thực tế](ADR/0004-docker-va-migration.md), [quy trình đồng bộ](ADR/0011-dong-bo-tai-lieu-database.md).

Trước commit thay đổi backend: review SSOT/ADR và DB/API docs bị ảnh hưởng, chạy `python scripts/generate_db_docs.py --check`. Khi cần cập nhật schema metadata, `python scripts/export_db_metadata.py` chỉ đọc catalog của đúng database dự án đang chạy, không migrate/seed hoặc xóa dữ liệu. Không xóa Docker images/volumes hoặc thao tác database dự án khác. [AGENTS.md](AGENTS.md) ghi điều kiện hoàn tất cho công việc tiếp theo.
