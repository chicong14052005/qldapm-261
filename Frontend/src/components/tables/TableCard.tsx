"use client";
import type { Table } from "@/types/table";
import styles from "./TableCard.module.css";

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
  return (
    <article
      className={`table-card ${styles.card} ${
        table.visit ? `occupied ${styles.occupied}` : ""
      }`.trim()}
    >
      <div className="card-top">
        <span className="table-symbol">▦</span>
        <span className={`badge ${table.visit ? "serving" : "free"}`}>
          {table.visit
            ? "Có khách"
            : table.isActive
              ? "Bàn trống"
              : "Tạm ngưng"}
        </span>
      </div>
      <h2>{table.code}</h2>
      <p className="muted">
        {table.visit
          ? `${table.visit.partySize} khách đang dùng bữa`
          : `Tối đa ${table.capacity} khách`}
      </p>
      <button
        className={table.visit ? "secondary wide" : "primary wide"}
        disabled={busy || !table.isActive || !connected}
        onClick={() =>
          table.visit ? onSelectOrder(table.visit.orderId) : onOpenTable(table)
        }
      >
        {table.visit ? "Xem đơn & gọi thêm" : "Mở lượt khách"} →
      </button>
      <div className="card-links">
        <button className="text-btn" onClick={() => onViewQr(table)}>
          Xem QR &amp; link
        </button>
        {canManage && (
          <button
            className="text-btn"
            disabled={Boolean(table.visit)}
            onClick={() => onEditTable(table)}
          >
            Sửa
          </button>
        )}
      </div>
    </article>
  );
}

