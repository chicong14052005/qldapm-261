"use client";
import { ArrowRight } from "lucide-react";
import type { Table } from "@/types/table";
import styles from "./TableCard.module.css";

type CardState = "occupied" | "free" | "inactive";

const BADGE_TEXT: Record<CardState, string> = {
  occupied: "Có khách",
  free: "Còn trống",
  inactive: "Tạm ngưng",
};

export default function TableCard({
  table,
  busy,
  connected,
  canManage,
  onSelectOrder,
  onOpenTable,
  onViewQr,
  onEditTable,
}: {
  table: Table;
  busy: boolean;
  connected: boolean;
  canManage: boolean;
  onSelectOrder: (orderId: string) => void;
  onOpenTable: (table: Table) => void;
  onViewQr: (table: Table) => void;
  onEditTable: (table: Table) => void;
}) {
  const state: CardState = table.visit
    ? "occupied"
    : table.isActive
      ? "free"
      : "inactive";
  const isOccupied = state === "occupied";

  return (
    <article className={`${styles.card} ${styles[state]}`}>
      <header className={styles.head}>
        <h2 className={styles.code}>{table.code}</h2>
        <div className={styles.status}>
          <span className={styles.statusLabel}>Trạng thái</span>
          <span className={styles.badge}>{BADGE_TEXT[state]}</span>
        </div>
      </header>

      <p className={styles.meta}>
        {table.visit
          ? `${table.visit.partySize} khách đang dùng bữa`
          : `Tối đa ${table.capacity} khách`}
      </p>

      <hr className={styles.divider} />

      <button
        type="button"
        className={styles.cta}
        disabled={busy || !table.isActive || !connected}
        onClick={() =>
          table.visit ? onSelectOrder(table.visit.orderId) : onOpenTable(table)
        }
      >
        <span>{isOccupied ? "Xem đơn & gọi thêm" : "Mở lượt khách"}</span>
        {isOccupied && (
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        )}
      </button>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.qrBtn}
          onClick={() => onViewQr(table)}
        >
          Xem QR &amp; link
        </button>
        {canManage && (
          <button
            type="button"
            className={styles.editBtn}
            disabled={isOccupied}
            title={isOccupied ? "Không sửa bàn khi đang có khách" : undefined}
            onClick={() => onEditTable(table)}
          >
            Chỉnh sửa
          </button>
        )}
      </div>
    </article>
  );
}
