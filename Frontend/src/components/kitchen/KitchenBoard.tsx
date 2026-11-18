"use client";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import EmptyState from "@/components/common/EmptyState";
import type { KitchenQueueItem } from "@/types/order";
import KitchenTicketCard from "./KitchenTicketCard";
import styles from "./KitchenBoard.module.css";

export default function KitchenBoard() {
  const { data, menu, setMenu, busy, connected, itemCommand, mutate, run } =
    useAuth();
  const items = data as KitchenQueueItem[];

  return (
    <>
      <div className="section-bar">
        <h2>
          Hàng đợi chế biến <small>{items.length} món</small>
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
            mode="kitchen"
            busy={busy}
            connected={connected}
            onAction={itemCommand}
          />
        ))}
      </div>
      {items.length === 0 && (
        <EmptyState text="Hàng đợi đang trống. Các món mới sẽ tự xuất hiện tại đây." />
      )}
      <div className={`panel availability-panel ${styles.availabilityPanel}`}>
        <h3>Cập nhật nhanh tình trạng món</h3>
        <div className={`availability-grid ${styles.availabilityGrid}`}>
          {menu.items.map((m) => (
            <button
              type="button"
              className={m.isAvailable ? "secondary" : "danger-btn"}
              key={m.id}
              onClick={() =>
                run(async () => {
                  await mutate(
                    `/menu-items/${m.id}/availability`,
                    {
                      expectedVersion: m.version,
                      isAvailable: !m.isAvailable,
                    },
                    "PATCH",
                  );
                  setMenu(await api("/menu"));
                })
              }
            >
              <span
                className={m.isAvailable ? "status-dot-on" : "status-dot-off"}
                aria-hidden="true"
              />
              <span>{m.name}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

