"use client";
import { useAuth } from "@/hooks/useAuth";
import EmptyState from "@/components/common/EmptyState";
import KitchenTicketCard from "@/components/kitchen/KitchenTicketCard";
import type { KitchenQueueItem } from "@/types/order";
import styles from "./ServingQueue.module.css";

export default function ServingQueue() {
  const { data, busy, connected, itemCommand } = useAuth();
  const items = data as KitchenQueueItem[];
  const dishCount = items.reduce((total, item) => total + item.quantity, 0);
  const destinationCount = new Set(items.map((item) => item.destination)).size;

  return (
    <>
      <header className={styles.pageHeading}>
        <h1>Chờ phục vụ</h1>
        <p>Món đã hoàn thành cần được đưa đến khách.</p>
      </header>
      <section className={styles.metrics} aria-label="Thống kê món chờ phục vụ">
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Món chờ phục vụ</span>
          <strong className={styles.metricValue}>{dishCount}</strong>
          <span className={styles.metricHint}>Sẵn sàng tại bếp</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Bàn / lượt cần phục vụ</span>
          <strong className={styles.metricValue}>{destinationCount}</strong>
          <span className={styles.metricHint}>Theo điểm nhận món</span>
        </div>
      </section>
      <div className={styles.queueHeading}>
        <h2>Đã sẵn sàng</h2>
        <span className="live-label">
          <span className="connection-dot" />
          Tự cập nhật mỗi giây
        </span>
      </div>
      <div className={styles.queue}>
        {items.map((i) => (
          <KitchenTicketCard
            key={i.id}
            item={i}
            mode="serving"
            busy={busy}
            connected={connected}
            onAction={itemCommand}
          />
        ))}
      </div>
      {items.length === 0 && (
        <EmptyState text="Hàng đợi đang trống. Các món mới sẽ tự xuất hiện tại đây." />
      )}
    </>
  );
}

