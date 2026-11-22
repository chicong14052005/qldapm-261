# Frontend — bản MVP đã triển khai (Cấu trúc Modular Vanilla CSS)

**Next.js 16.4.6 / React 19.3.1 / TypeScript**, Node 24 container. Có production standalone build và package-lock.
Toàn bộ mã nguồn trong `src/` được phân tách rõ ràng theo chuẩn Next.js App Router và **100% Vanilla CSS** (xem chi tiết tại [frontend_tree.md](frontend_tree.md)):

- `src/styles/`: Hệ thống Vanilla CSS 4 tầng (`tokens.css`, `reset.css`, `primitives.css`, `layout.css`).
- `src/app/`: Các Route Groups theo vai trò (`(public)`, `(customer)`, `(staff)`, `(management)`) kèm error/not-found boundaries.
- `src/components/`: Chia theo domain nghiệp vụ (`tables/`, `menu/`, `orders/`, `approvals/`, `kitchen/`, `serving/`, `billing/`, `staff/`), khung giao diện (`layout/`), providers (`providers/`) và UI dùng chung (`common/`) kèm CSS Modules (`*.module.css`).
- `src/config/`, `src/hooks/`, `src/lib/`, `src/types/`: Cấu hình tĩnh, custom React hooks (`useAuth`, `usePolling`, `useAsyncAction`, `useCopyToClipboard`), API client (`api.ts` xử lý cookie/CSRF/errors/idempotency) và TypeScript interfaces.

Tham khảo tài liệu kiến trúc:
- [Cây thư mục & hướng dẫn chi tiết Frontend](frontend_tree.md).
- [Kiến trúc/cây route và thư mục](../ADR/0002-kien-truc-va-cau-truc.md).
- [Lựa chọn stack và lock phiên bản](../ADR/0001-tech-stack.md).
- [API, cookies, polling và xử lý mất response](../ADR/0005-api-va-nhat-quan.md).
- [Task UI/tích hợp/UAT](../ADR/0006-implementation-plan.md).
- [SSOT nghiệp vụ](../SSOT/README.md).

Run tại repo root: `docker compose up -d --build`, mở `http://localhost:3000`; F12 → Ctrl+Shift+M để xem mobile/tablet. Browser gọi API cùng origin qua Caddy, không DB trực tiếp. CSS responsive thuần Vanilla CSS + CSS Modules, không dùng Tailwind/TanStack/Zod theo [ADR-0008](../ADR/0008-mvp-local-va-quyet-dinh-trien-khai.md). Nhiều tab cùng profile chia sẻ staff cookie; dùng profile/ẩn danh riêng cho nhiều role. Khách có header `X-Actor: guest` để chọn cookie khách khi cùng giữ cookie staff.

QR cố định: `src/components/tables/TableQrDialog.tsx`, `qrcode 1.5.4` render PNG cục bộ; `copy-table-url.ts`, `date-time.ts` và `format.ts` có unit tests trong `tests/*.test.mjs`. Chạy `docker build --target tests -t restaurant-ordering-frontend-tests ./Frontend`. QR page tự join bằng token, không mã nhập. [Hướng dẫn](../GUIDE/QR-TAI-BAN.md).
