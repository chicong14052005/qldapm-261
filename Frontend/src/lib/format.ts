export const money = (n: number | null | undefined): string =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n ?? 0);

export const formatTime = (s: string | null | undefined): string => {
  if (!s) return "—";
  const date = new Date(s);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

export const padStatNumber = (value: number): string =>
  Math.max(0, value).toString().padStart(2, "0");

