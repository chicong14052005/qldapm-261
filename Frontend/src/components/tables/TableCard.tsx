"use client";
import { ArrowRight, LayoutGrid } from "lucide-react";
import type { Table } from "@/types/table";
import styles from "./TableCard.module.css";

export default function TableCard({
  table,
  busy,
  connected,
  canManage,
  canUnlockQr,
  onSelectOrder,
  onOpenTable,
  onViewQr,
  onUnlockQr,
  onEditTable,
}: {
  table: Table;
  busy: boolean;
  connected: boolean;
  canManage: boolean;
  canUnlockQr: boolean;
  onSelectOrder: (orderId: string) => void;
  onOpenTable: (table: Table) => void;
  onViewQr: (table: Table) => void;
  onUnlockQr: (table: Table) => void;
  onEditTable: (table: Table) => void;
}) {
  const isOccupied = Boolean(table.visit);
  const subStatusText = table.visit
    ? table.visit.hasActiveGuestSession
      ? "Đã giữ QR"
      : "Chờ quét QR"
    : table.isActive
      ? "Sẵn sàng đón khách"
      : "Bàn đang tạm ngưng";

  const subStatusClass = table.visit
    ? table.visit.hasActiveGuestSession
      ? styles.metaSubClaimed
      : styles.metaSubWaiting
    : "";

  return (
    <article
      className={`table-card ${styles.card} ${
        isOccupied ? `occupied ${styles.occupied}` : ""
      }`.trim()}
    >
      <div className="card-top">
        <span className="table-symbol" aria-hidden="true">
          <LayoutGrid size={18} strokeWidth={1.9} />
        </span>
        <span className={`badge ${isOccupied ? "serving" : "free"}`}>
          {isOccupied
            ? "Có khách"
            : table.isActive
              ? "Bàn trống"
              : "Tạm ngưng"}
        </span>
      </div>

      <h2 className={styles.code}>{table.code}</h2>

      <div className={styles.meta}>
        <p className={styles.metaPrimary}>
          {table.visit
            ? `${table.visit.partySize} khách đang dùng bữa`
            : `Tối đa ${table.capacity} khách`}
        </p>
        <span className={`${styles.metaSub} ${subStatusClass}`.trim()}>
          {subStatusText}
        </span>
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={`${isOccupied ? "secondary" : "primary"} wide ${styles.ctaBtn}`}
          disabled={busy || !table.isActive || !connected}
          onClick={() =>
            table.visit ? onSelectOrder(table.visit.orderId) : onOpenTable(table)
          }
        >
          <span>{isOccupied ? "Xem đơn & gọi thêm" : "Mở lượt khách"}</span>
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </button>

        <div className={styles.links}>
          <button
            type="button"
            className={`text-btn ${styles.linkBtn}`}
            onClick={() => onViewQr(table)}
          >
            Xem QR &amp; link
          </button>

          {canUnlockQr && table.visit?.hasActiveGuestSession && (
            <button
              type="button"
              className={`text-btn ${styles.linkBtn}`}
              disabled={busy || !connected}
              onClick={() => onUnlockQr(table)}
            >
              Mở khóa QR
            </button>
          )}

          {canManage && !isOccupied && (
            <button
              type="button"
              className={`text-btn ${styles.linkBtn}`}
              onClick={() => onEditTable(table)}
            >
              Sửa
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
