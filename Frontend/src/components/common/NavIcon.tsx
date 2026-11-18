"use client";
import {
  Bell,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Clock,
  LayoutDashboard,
  Users,
  Utensils,
  Wallet,
} from "lucide-react";

const iconMap = {
  tables: LayoutDashboard,
  orders: ClipboardList,
  menu: Utensils,
  kitchen: ChefHat,
  approvals: CheckCircle2,
  serving: Bell,
  billing: Wallet,
  "payment-history": Clock,
  staff: Users,
} as const;

export type NavIconName = keyof typeof iconMap;

export default function NavIcon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  const Icon = iconMap[name as NavIconName] ?? LayoutDashboard;
  return <Icon size={size} strokeWidth={1.9} aria-hidden="true" />;
}

