"use client";

/* Ký hiệu mảnh theo mẫu sidebar mới (20/11/2026) */
const glyphMap = {
  tables: "▦",
  orders: "≡",
  menu: "◉",
  kitchen: "♨",
  approvals: "√",
  serving: "◇",
  billing: "₫",
  "payment-history": "◷",
  staff: "♙",
  settings: "▣",
} as const;

export type NavIconName = keyof typeof glyphMap;

export default function NavIcon({
  name,
  size = 18,
}: {
  name: string;
  size?: number;
}) {
  const glyph = glyphMap[name as NavIconName] ?? "▦";
  return (
    <span
      className="nav-glyph"
      style={{ fontSize: size }}
      aria-hidden="true"
    >
      {glyph}
    </span>
  );
}
