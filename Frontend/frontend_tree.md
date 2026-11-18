# Thiết kế Cây Thư Mục Frontend (`qldapm-261/Frontend` — Vanilla CSS)

## 1. Nguyên tắc thiết kế (Vanilla CSS + Next.js App Router)

1. **100% Vanilla CSS — Không Tailwind, không PostCSS**:
   - Toàn bộ styling sử dụng CSS thuần chuẩn W3C (`CSS Custom Properties`, `Flexbox`, `CSS Grid`, `@media`), không cài đặt `tailwindcss` hay `postcss`.
   - Tách file `src/app/globals.css` (hiện đang gộp toàn bộ style của cả hệ thống vào một file) thành hệ thống **`src/styles/`** gồm các tầng rõ ràng (`tokens.css`, `reset.css`, `primitives.css`).
2. **Scoped Vanilla CSS theo từng Component / Route (`*.module.css`)**:
   - Đặt CSS ngay cạnh component của từng page, tận dụng **CSS Modules** được Next.js hỗ trợ sẵn (`.module.css`) cho từng component/route.
   - Cách này vẫn viết 100% Vanilla CSS thuần, vừa tránh được xung đột tên class khi 4 thành viên làm việc song song ở các phân hệ khác nhau (`customer`, `waiter`, `kitchen`, `cashier`, `manage`).
3. **Giữ `src/` làm gốc mã nguồn (`@/* -> ./src/*`)**:
   - Tương thích trực tiếp với `tsconfig.json` và `Dockerfile` (`output: "standalone"`).
4. **Tách `src/app/` thành các Route Groups theo vai trò**:
   - Loại bỏ catch-all `src/app/[...path]/page.tsx`, thay bằng các route thật trong `(public)`, `(customer)`, `(staff)`, `(management)`.
5. **Tách `src/components/` theo Domain/Nghiệp vụ + `common/` + `providers/`**:
   - Chia nhỏ `RestaurantApp.tsx` thành các thư mục domain độc lập (`tables/`, `menu/`, `orders/`, `approvals/`, `kitchen/`, `serving/`, `billing/`, `staff/`).

---

## 2. Cây thư mục mới cho `qldapm-261/Frontend`

```text
Frontend/
├── .dockerignore
├── .env.example                    # Mẫu biến môi trường frontend (nếu có NEXT_PUBLIC_*)
├── Dockerfile
├── eslint.config.mjs               # Cấu hình ESLint chuẩn Next.js + TypeScript
├── next-env.d.ts
├── next.config.ts                  # output: "standalone", poweredByHeader: false
├── package.json                    # Không có tailwindcss / postcss
├── package-lock.json
├── README.md
├── frontend_tree.md                # Tài liệu cấu trúc & hướng dẫn refactor này
├── tsconfig.json                   # "@/*": ["./src/*"]
│
├── public/
│   ├── icons/                      # Icon UI tĩnh (SVG)
│   ├── login/
│   │   └── login_background.png    # Ảnh nền trang đăng nhập / tham gia bàn ăn
│   ├── logo/
│   │   └── logo.ico                # Logo & Favicon chính thức của Bếp Nhà
│   └── menu/
│       └── placeholder.svg         # Ảnh mặc định cho món ăn
│
├── tests/                          # Unit tests chạy bằng `node --test tests/*.test.mjs`
│   ├── copy-table-url.test.mjs
│   ├── date-time.test.mjs
│   └── format.test.mjs
│
└── src/
    ├── styles/                     # Tầng Vanilla CSS dùng chung toàn hệ thống (thay cho 1 file globals.css khổng lồ)
    │   ├── tokens.css              # CSS Variables: --bg, --panel, --ink, --muted, --green, --light, --line, --orange, --red, spacing, radius, font
    │   ├── reset.css               # Reset mặc định (*, body, button, input, select, h1-h3, a)
    │   ├── primitives.css          # Style nền tảng dùng chung (.primary, .secondary, .danger-btn, .badge, .alert, .panel, .modal, .table-wrap)
    │   └── layout.css              # Khung responsive dùng chung cho shell, grid, breakpoints
    │
    ├── app/                        # Next.js App Router (Routing, Layout & Route-level CSS)
    │   ├── globals.css             # Chỉ import các file trong src/styles/ theo thứ tự (tokens -> reset -> primitives -> layout)
    │   ├── layout.tsx              # RootLayout: import globals.css, font Inter & Agbalumo (next/font/google), favicon logo.ico, bọc AppProviders
    │   ├── error.tsx               # Error boundary cấp ứng dụng
    │   ├── global-error.tsx        # Fallback lỗi nghiêm trọng ở RootLayout
    │   ├── not-found.tsx           # Trang 404
    │   ├── page.tsx                # Trang chủ: điều hướng theo phiên hiện tại (/login hoặc workspace theo role)
    │   │
    │   ├── (public)/               # Nhóm route công khai (không cần đăng nhập nhân viên)
    │   │   ├── login/
    │   │   │   ├── page.tsx        # Đăng nhập nhân viên / quản lý (/login)
    │   │   │   ├── LoginForm.tsx   # Component form đăng nhập cục bộ
    │   │   │   └── login.module.css
    │   │   └── qr/
    │   │       └── [token]/
    │   │           └── page.tsx    # Quét QR bàn (/qr/[token]): khởi tạo guest session & chuyển sang /customer
    │   │
    │   ├── (customer)/             # Nhóm route Khách hàng tại bàn
    │   │   ├── layout.tsx          # Layout tối giản mobile-first cho khách
    │   │   ├── customer-layout.module.css
    │   │   └── customer/
    │   │       ├── page.tsx        # Trang gọi món & theo dõi đơn của khách (/customer)
    │   │       └── customer.module.css
    │   │
    │   ├── (staff)/                # Nhóm route vận hành theo ca (Phục vụ, Bếp, Thu ngân)
    │   │   ├── layout.tsx          # StaffShell: Sidebar/Topbar theo role + kiểm tra phiên đăng nhập
    │   │   ├── waiter/
    │   │   │   ├── page.tsx        # Phục vụ (/waiter)
    │   │   │   └── waiter.module.css
    │   │   ├── kitchen/
    │   │   │   ├── page.tsx        # Bếp KDS (/kitchen)
    │   │   │   └── kitchen.module.css
    │   │   └── cashier/
    │   │       ├── page.tsx        # Thu ngân (/cashier)
    │   │       └── cashier.module.css
    │   │
    │   └── (management)/           # Nhóm route Quản lý & Quản trị hệ thống
    │       ├── layout.tsx          # ManagementShell: guard role MANAGER/ADMIN
    │       ├── manage/
    │       │   ├── page.tsx        # Tổng quan quản lý (/manage)
    │       │   ├── menu/
    │       │   │   └── page.tsx    # Quản lý thực đơn & danh mục (/manage/menu)
    │       │   ├── tables/
    │       │   │   └── page.tsx    # Quản lý bàn & mã QR (/manage/tables)
    │       │   └── staff/
    │       │       └── page.tsx    # Quản lý nhân viên (/manage/staff)
    │       └── admin/
    │           ├── page.tsx        # Dashboard quản trị (/admin)
    │           └── payments/
    │               └── page.tsx    # Lịch sử thanh toán & đối soát (/admin/payments)
    │
    ├── components/                 # UI Components tái sử dụng, chia theo domain + colocated .module.css
    │   ├── common/                 # UI primitives dùng chung toàn app
    │   │   ├── BrandLogo.tsx
    │   │   ├── ConfirmDialog.tsx
    │   │   ├── EmptyState.tsx
    │   │   ├── LoadingSpinner.tsx
    │   │   ├── Modal.tsx
    │   │   ├── Modal.module.css
    │   │   ├── NavIcon.tsx
    │   │   ├── Pagination.tsx
    │   │   ├── StatusBadge.tsx
    │   │   └── Toast.tsx
    │   │
    │   ├── layout/                 # Khung giao diện dùng chung (tương tự Header/Footer của daphovina)
    │   │   ├── AppHeader.tsx
    │   │   ├── AppHeader.module.css
    │   │   ├── RoleSidebar.tsx
    │   │   ├── RoleSidebar.module.css
    │   │   ├── WorkspaceShell.tsx
    │   │   └── WorkspaceShell.module.css
    │   │
    │   ├── providers/              # Context Providers bọc ở RootLayout
    │   │   ├── AppProviders.tsx
    │   │   ├── AuthProvider.tsx
    │   │   └── ToastProvider.tsx
    │   │
    │   ├── tables/                 # Nghiệp vụ Bàn & QR (P1.1, P1.2)
    │   │   ├── TableGrid.tsx
    │   │   ├── TableCard.tsx
    │   │   ├── TableCard.module.css
    │   │   ├── TableFormModal.tsx
    │   │   ├── TableQrDialog.tsx   # Di chuyển từ src/components/TableQrDialog.tsx
    │   │   └── TableQrDialog.module.css
    │   │
    │   ├── menu/                   # Nghiệp vụ Thực đơn (P1.1, P1.2)
    │   │   ├── MenuCatalog.tsx
    │   │   ├── MenuItemCard.tsx
    │   │   ├── MenuItemCard.module.css
    │   │   ├── CategoryFilter.tsx
    │   │   └── MenuItemFormModal.tsx
    │   │
    │   ├── orders/                 # Nghiệp vụ Đặt món & Đơn hàng (P1.2, P1.3)
    │   │   ├── OrderCart.tsx
    │   │   ├── OrderCart.module.css
    │   │   ├── OrderDetailPanel.tsx
    │   │   ├── OrderItemList.tsx
    │   │   └── OrderStatusTimeline.tsx
    │   │
    │   ├── approvals/              # Nghiệp vụ Duyệt yêu cầu từ khách (P1.3)
    │   │   ├── ApprovalQueue.tsx
    │   │   └── ApprovalCard.tsx
    │   │
    │   ├── kitchen/                # Nghiệp vụ Bếp KDS (P1.4)
    │   │   ├── KitchenBoard.tsx
    │   │   ├── KitchenBoard.module.css
    │   │   └── KitchenTicketCard.tsx
    │   │
    │   ├── serving/                # Nghiệp vụ Trả món / Phục vụ bàn (P1.4)
    │   │   └── ServingQueue.tsx
    │   │
    │   ├── billing/                # Nghiệp vụ Thanh toán & Hóa đơn (P1.5)
    │   │   ├── BillingPanel.tsx
    │   │   ├── ReceiptModal.tsx
    │   │   ├── PaymentHistory.tsx  # Di chuyển từ src/components/PaymentHistory.tsx
    │   │   └── PaymentHistory.module.css
    │   │
    │   └── staff/                  # Nghiệp vụ Nhân sự & Phân quyền (P1.6)
    │       ├── StaffTable.tsx
    │       └── StaffFormModal.tsx
    │
    ├── config/                     # Cấu hình tĩnh & hằng số nghiệp vụ
    │   ├── navigation.ts           # Danh sách tab/route theo từng Role
    │   ├── polling.ts              # Chu kỳ polling (1000ms staff, 2000ms guest)
    │   ├── roles.ts                # Role & route mặc định sau đăng nhập
    │   └── status.ts               # Nhãn tiếng Việt & biến trạng thái cho Badge
    │
    ├── hooks/                      # Custom React Hooks
    │   ├── useAuth.ts
    │   ├── usePolling.ts
    │   ├── useAsyncAction.ts
    │   └── useCopyToClipboard.ts
    │
    ├── lib/                        # Tiện ích thuần & API Client (không phụ thuộc React UI)
    │   ├── api.ts                  # ApiError, api(), key() (giữ CSRF + Idempotency-Key)
    │   ├── copy-table-url.ts       # Giữ nguyên & tiếp tục unit test
    │   ├── date-time.ts            # Giữ nguyên & tiếp tục unit test
    │   └── format.ts               # Tách money(), formatQuantity() từ api.ts
    │
    └── types/                      # TypeScript Interfaces dùng chung
        ├── api.ts
        ├── auth.ts
        ├── menu.ts
        ├── order.ts
        ├── payment.ts
        └── table.ts
```

---

## 3. Bảng ánh xạ từ cấu trúc hiện tại sang cấu trúc mới

| File / Thành phần hiện tại                                   | Vị trí mới đề xuất                                                                                                          | Lý do & Ghi chú                                                                                                                                   |
| :----------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/globals.css` (toàn bộ CSS nén trong 1 file)         | Chia về `src/styles/tokens.css`, `reset.css`, `primitives.css`, `layout.css` + các file `*.module.css` theo component/route | Tách design system khỏi CSS đặc thù của từng màn hình; giữ nguyên bảng biến `--bg`, `--panel`, `--ink`, `--green`, `--line`, `--orange`, `--red`. |
| `src/app/[...path]/page.tsx`                                 | **Loại bỏ dần**, thay bằng route thật trong `src/app/(public)/`, `(customer)/`, `(staff)/`, `(management)/`                 | URL rõ ràng, tách CSS & JS bundle theo từng route.                                                                                                |
| `src/components/RestaurantApp.tsx` (State auth & boot guest) | `src/components/providers/AuthProvider.tsx` + `src/hooks/useAuth.ts`                                                        | Tách biệt quản lý phiên với giao diện từng màn hình.                                                                                              |
| `src/components/RestaurantApp.tsx` (Polling 1s/2s)           | `src/hooks/usePolling.ts` + `src/config/polling.ts`                                                                         | Dùng lại gọn gàng ở từng trang và tự dọn timer khi unmount.                                                                                       |
| `src/components/RestaurantApp.tsx` (9 tab nghiệp vụ)         | Các thư mục trong `src/components/<domain>/` gắn vào từng `page.tsx`                                                        | Dễ chia việc song song, tránh merge conflict.                                                                                                     |
| `src/components/TableQrDialog.tsx`                           | `src/components/tables/TableQrDialog.tsx` + `TableQrDialog.module.css`                                                      | Tách `.qr-modal`, `.qr-image-area`, `.qr-actions` từ `globals.css` sang CSS Module riêng.                                                         |
| `src/components/PaymentHistory.tsx`                          | `src/components/billing/PaymentHistory.tsx` + `PaymentHistory.module.css`                                                   | Tách `.history-filters`, `.history-table`, `.history-detail-grid` từ `globals.css` sang CSS Module riêng.                                         |
| `src/lib/api.ts` (`money`, `labels`)                         | `src/lib/format.ts` & `src/config/status.ts` (re-export tạm nếu cần)                                                        | `api.ts` chỉ chịu trách nhiệm HTTP + CSRF + Idempotency-Key.                                                                                      |
| `src/lib/copy-table-url.ts`, `src/lib/date-time.ts`          | Giữ nguyên tại `src/lib/`                                                                                                   | Tương thích 100% với `tests/*.test.mjs`.                                                                                                          |

---

## 4. Hướng dẫn chi tiết cách tổ chức Vanilla CSS & Code

### 4.1. Kiến trúc Vanilla CSS 3 tầng (Không Tailwind)

1. **Tầng 1 — Tokens & Reset (`src/styles/tokens.css`, `reset.css`)**:
   - Toàn bộ màu sắc, font chữ, bo góc, kích thước sidebar, breakpoint responsive chỉ định nghĩa một lần bằng CSS Variables trong `:root`.
   - Tuyệt đối không hard-code mã màu rải rác trong component; luôn dùng `var(--green)`, `var(--line)`, `var(--muted)`, `var(--ink)`.
2. **Tầng 2 — Primitives dùng chung (`src/styles/primitives.css`)**:
   - Giữ lại các class dùng chung ở nhiều màn hình như `.primary`, `.secondary`, `.danger-btn`, `.badge`, `.alert`, `.panel`, `.table-wrap`.
   - `src/app/globals.css` chỉ làm nhiệm vụ tập hợp:
     ```css
     @import "../styles/tokens.css";
     @import "../styles/reset.css";
     @import "../styles/primitives.css";
     @import "../styles/layout.css";
     ```
3. **Tầng 3 — CSS Modules cục bộ (`*.module.css`)**:
   - Style riêng của từng component hoặc trang (ví dụ `KitchenBoard.module.css`, `OrderCart.module.css`, `login.module.css`) đặt ngay cạnh file `.tsx` tương ứng.
   - Import chuẩn Next.js:
     ```tsx
     import styles from "./TableCard.module.css";
     ```
   - Không cần cài thêm bất kỳ thư viện CSS-in-JS hay Tailwind plugin nào.

### 4.2. Quy tắc cho `src/app/` và `src/components/`

- **Route Groups `(public)`, `(customer)`, `(staff)`, `(management)`**: Giúp chia `layout.tsx` và kiểm tra quyền truy cập theo nhóm vai trò mà không làm dài URL.
- **Component cục bộ vs Component dùng chung**:
  - Chỉ dùng ở 1 route (ví dụ `LoginForm.tsx` + `login.module.css`): đặt ngay cạnh `page.tsx`.
  - Dùng ở >= 2 route (ví dụ `MenuCatalog.tsx`, `TableQrDialog.tsx`): đặt trong `src/components/<domain>/`.
- **Giữ kích thước file nhỏ gọn**: Mỗi component `.tsx` nên dưới ~200 dòng; khi dài hơn hãy tách card con hoặc modal con.

### 4.3. Quy tắc cho `src/lib/`, `src/hooks/`, `src/config/`, `src/types/`

- **`src/lib/` thuần TypeScript/JS**: Không import React hay CSS để `node --test tests/*.test.mjs` chạy trực tiếp được.
- **Giữ nguyên cơ chế bảo mật trong `src/lib/api.ts`**: Tự động lấy `/api/v1/auth/csrf` gắn `X-CSRF-TOKEN` và `Idempotency-Key` cho mọi request khác `GET`, giữ `{ guest: true }` gắn `X-Actor: guest`.

---

## 5. Lộ trình chuyển đổi từng bước (An toàn, không làm gián đoạn hệ thống)

1. **Bước 1 — Tách Vanilla CSS nền (`src/styles/`)**:
   - Tạo `tokens.css`, `reset.css`, `primitives.css`, `layout.css` từ `src/app/globals.css` hiện tại và import lại vào `src/app/globals.css`.
   - Kiểm tra giao diện hiện tại vẫn hiển thị y hệt trước khi tách component.
2. **Bước 2 — Dựng nền `types/`, `config/`, `lib/format.ts`, `hooks/`**:
   - Tạo `src/types/`, `src/config/`, `src/hooks/` (`usePolling.ts`, `useAsyncAction.ts`, `useAuth.ts`).
   - Tách `money` và `labels` khỏi `api.ts` (re-export tạm để không gãy import cũ).
3. **Bước 3 — Tách `common/`, `providers/` và các domain components kèm `*.module.css`**:
   - Di chuyển `TableQrDialog.tsx` -> `src/components/tables/` và `PaymentHistory.tsx` -> `src/components/billing/` kèm `.module.css` tương ứng.
   - Chia 4 thành viên làm song song 4 nhóm domain:
     - Thành viên 1: `tables/` + `menu/`
     - Thành viên 2: `orders/` + `approvals/`
     - Thành viên 3: `kitchen/` + `serving/`
     - Thành viên 4: `billing/` + `staff/`
4. **Bước 4 — Chuyển sang Route thật trong `src/app/`**:
   - Tạo lần lượt `(public)/login`, `(public)/qr/[token]`, `(customer)/customer`, `(staff)/waiter`, `(staff)/kitchen`, `(staff)/cashier`, `(management)/manage/*`, `(management)/admin/*`.
5. **Bước 5 — Dọn dẹp & kiểm tra chất lượng**:
   - Xóa `src/app/[...path]/page.tsx` và `src/components/RestaurantApp.tsx` sau khi toàn bộ route mới đã chạy ổn định.
   - Chạy kiểm tra bắt buộc:
     - `npm run typecheck`
     - `npm test` (`node --test tests/*.test.mjs`)
     - `npm run build` (xác nhận build standalone cho Docker thành công)
