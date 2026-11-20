"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { KitchenQueueItem } from "@/types/order";
import KitchenTicketCard, { getKitchenWaitAge } from "./KitchenTicketCard";
import styles from "./KitchenBoard.module.css";

type ColumnId = "waiting" | "cooking" | "ready";

const columns: { id: ColumnId; title: string; description: string; statuses: string[]; empty: string }[] = [
  { id: "waiting", title: "Chờ tiếp nhận", description: "Món mới cần bếp xác nhận", statuses: ["PLACED"], empty: "Chưa có món mới." },
  { id: "cooking", title: "Đang chế biến", description: "Đã nhận và đang nấu", statuses: ["ACCEPTED", "PREPARING"], empty: "Chưa có món đang nấu." },
  { id: "ready", title: "Chờ bàn giao", description: "Đã hoàn thành, chờ phục vụ", statuses: ["READY"], empty: "Chưa có món chờ bàn giao." },
];

export default function KitchenBoard() {
  const { data, menu, setMenu, busy, connected, itemCommand, mutate, notify, run } = useAuth();
  const items = data as KitchenQueueItem[];
  const [activeColumn, setActiveColumn] = useState<ColumnId>("waiting");
  const counts = {
    waiting: items.filter((item) => item.status === "PLACED").length,
    cooking: items.filter((item) => item.status === "ACCEPTED" || item.status === "PREPARING").length,
    ready: items.filter((item) => item.status === "READY").length,
    late: items.filter((item) => getKitchenWaitAge(item.eligibleAt).isLate).length,
  };
  const columnClassNames = {
    waiting: styles.waitingColumn,
    cooking: styles.cookingColumn,
    ready: styles.readyColumn,
  };

  return (
    <>
      <div className="section-bar">
        <h2>Tiến độ chế biến</h2>
        <span className="live-label"><span className="connection-dot" />Tự cập nhật mỗi giây</span>
      </div>
      <div className={styles.metrics} aria-label="Thống kê tiến độ bếp">
        <div className={`${styles.metric} ${styles.waitingMetric}`}><span className={styles.metricLabel}>Chờ tiếp nhận</span><strong className={styles.metricValue}>{counts.waiting}</strong></div>
        <div className={`${styles.metric} ${styles.cookingMetric}`}><span className={styles.metricLabel}>Đang chế biến</span><strong className={styles.metricValue}>{counts.cooking}</strong></div>
        <div className={`${styles.metric} ${styles.readyMetric}`}><span className={styles.metricLabel}>Chờ bàn giao</span><strong className={styles.metricValue}>{counts.ready}</strong></div>
        <div className={`${styles.metric} ${styles.lateMetric}`}><span className={styles.metricLabel}>Món trễ</span><strong className={styles.metricValue}>{counts.late}</strong></div>
      </div>
      <nav className={styles.columnTabs} aria-label="Lọc món theo trạng thái">
        {columns.map((column) => {
          const count = counts[column.id];
          return (
            <button
              type="button"
              key={column.id}
              className={`${styles.columnTab} ${activeColumn === column.id ? styles.activeTab : ""}`}
              aria-pressed={activeColumn === column.id}
              onClick={() => setActiveColumn(column.id)}
            >
              <span>{column.title}</span>
              <span className={`${styles.count} ${styles[column.id]}`}>{count}</span>
            </button>
          );
        })}
      </nav>
      <div className={styles.board}>
        {columns.map((column) => {
          const columnItems = items.filter((item) => column.statuses.includes(item.status));
          return (
            <section
              className={`${styles.column} ${columnClassNames[column.id]} ${activeColumn === column.id ? styles.activeColumn : ""}`}
              key={column.id}
              aria-label={column.title}
            >
              <header className={styles.columnHeader}>
                <div><h3>{column.title}</h3><p>{column.description}</p></div>
                <span className={`${styles.count} ${styles[column.id]}`}>{columnItems.length}</span>
              </header>
              <div className={styles.ticketList}>
                {columnItems.map((item) => <KitchenTicketCard key={item.id} item={item} mode="kitchen" busy={busy} connected={connected} onAction={itemCommand} />)}
                {columnItems.length === 0 && <p className={styles.emptyColumn}>{column.empty}</p>}
              </div>
            </section>
          );
        })}
      </div>
      <div className={`panel availability-panel ${styles.availabilityPanel}`}>
        <div className={styles.availabilityHeading}>
          <div><h3>Cập nhật nhanh tình trạng còn món</h3><p>Chạm vào món để chuyển giữa “Đang bán” và “Hết món”. Thay đổi áp dụng ngay trên thực đơn.</p></div>
          <span className={styles.availabilitySummary}>{menu.items.filter((item) => !item.isAvailable).length} món đang hết</span>
        </div>
        <div className={`availability-grid ${styles.availabilityGrid}`}>
          {menu.items.map((item) => (
            <button
              type="button"
              className={`${styles.availabilityButton} ${item.isAvailable ? styles.available : styles.unavailable}`}
              key={item.id}
              aria-pressed={!item.isAvailable}
              disabled={busy || !connected}
              onClick={() => run(async () => {
                await mutate(`/menu-items/${item.id}/availability`, { expectedVersion: item.version, isAvailable: !item.isAvailable }, "PATCH");
                setMenu(await api("/menu"));
                notify(item.isAvailable ? `Đã tạm hết ${item.name}.` : `${item.name} đã có lại trên thực đơn.`);
              })}
            >
              <span className={item.isAvailable ? "status-dot-on" : "status-dot-off"} aria-hidden="true" />
              <span className={styles.availabilityName}>{item.name}</span>
              <span className={styles.availabilityState}>{item.isAvailable ? "Đang bán" : "Hết món"}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
