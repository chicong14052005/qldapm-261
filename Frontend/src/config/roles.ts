import type { User } from "@/types/auth";

export const roleNames: Record<string, string> = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
  WAITER: "Phục vụ",
  KITCHEN: "Nhà bếp",
  CASHIER: "Thu ngân",
  CUSTOMER: "Khách tại bàn",
};

export function hasRole(user: User | null | undefined, ...roles: string[]): boolean {
  return Boolean(user?.roles?.some((r: string) => roles.includes(r)));
}

export function getDefaultTabForUser(user: User | null | undefined): string {
  if (!user) return "tables";
  if (user.isGuest || user.roles?.includes("CUSTOMER")) return "menu";
  if (user.roles?.includes("KITCHEN")) return "kitchen";
  if (user.roles?.includes("CASHIER")) return "billing";
  return "tables";
}

export function getDefaultRouteForUser(user: User | null | undefined): string {
  if (!user) return "/login";
  if (user.isGuest || user.roles?.includes("CUSTOMER")) return "/customer";
  if (user.roles?.includes("ADMIN")) return "/admin";
  if (user.roles?.includes("MANAGER")) return "/manage";
  if (user.roles?.includes("KITCHEN")) return "/kitchen";
  if (user.roles?.includes("CASHIER")) return "/cashier";
  return "/waiter";
}

