"use client";
import { useAuth } from "@/hooks/useAuth";
import EmptyState from "@/components/common/EmptyState";
import KitchenTicketCard from "@/components/kitchen/KitchenTicketCard";
import type { KitchenQueueItem } from "@/types/order";

export default function ServingQueue() {
  const { data, busy, connected, itemCommand } = useAuth();
  const items = data as KitchenQueueItem[];

  return (
    <>
      <div className="section-bar">
        <h2>
          Món đã sẵn sàng <small>{items.length} món</small>
        </h2>
        <span className="live-label">
          <span className="connection-dot" />
          Tự cập nhật mỗi giây
        </span>
      </div>
      <div className="order-cards">
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

