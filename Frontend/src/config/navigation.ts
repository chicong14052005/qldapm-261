export type NavItem = {
  id: string;
  label: string;
  icon: string;
  href: string;
  roles: string[];
};

export const navs: NavItem[] = [
  { id: "tables", label: "Bàn & lượt khách", icon: "▦", href: "/waiter", roles: ["WAITER", "MANAGER", "ADMIN"] },
  { id: "orders", label: "Đơn đang phục vụ", icon: "≡", href: "/waiter", roles: ["WAITER", "CASHIER", "MANAGER", "ADMIN"] },
  { id: "menu", label: "Thực đơn", icon: "◉", href: "/manage/menu", roles: ["WAITER", "CASHIER", "MANAGER", "ADMIN", "CUSTOMER"] },
  { id: "kitchen", label: "Màn hình bếp", icon: "♨", href: "/kitchen", roles: ["KITCHEN", "MANAGER", "ADMIN"] },
  { id: "approvals", label: "Duyệt gọi thêm", icon: "✓", href: "/kitchen", roles: ["KITCHEN", "MANAGER", "ADMIN"] },
  { id: "serving", label: "Chờ phục vụ", icon: "◇", href: "/waiter", roles: ["WAITER", "CASHIER", "MANAGER", "ADMIN"] },
  { id: "billing", label: "Thanh toán", icon: "₫", href: "/cashier", roles: ["CASHIER", "MANAGER", "ADMIN"] },
  { id: "payment-history", label: "Lịch sử thanh toán", icon: "◷", href: "/admin/payments", roles: ["ADMIN"] },
  { id: "staff", label: "Tài khoản nhân viên", icon: "♙", href: "/manage/staff", roles: ["ADMIN"] },
];

export function resolveInitialTabFromPath(pathname: string): string {
  if (pathname.includes("admin/payments")) return "payment-history";
  if (pathname.includes("manage/tables")) return "tables";
  if (pathname.includes("manage/staff")) return "staff";
  if (pathname.includes("manage/menu") || pathname.includes("manage")) return "menu";
  if (pathname.includes("kitchen")) return "kitchen";
  if (pathname.includes("cashier")) return "billing";
  if (pathname.includes("admin")) return "staff";
  if (pathname.includes("customer") || pathname.startsWith("/qr/")) return "menu";
  return "tables";
}

