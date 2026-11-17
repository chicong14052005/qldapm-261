"use client";
import { formatTime } from "@/lib/format";
import StatusBadge from "@/components/common/StatusBadge";
import type { KitchenQueueItem } from "@/types/order";

export default function KitchenTicketCard({
  item,
  mode,
  busy,
  connected,
  onAction,
}: {
  item: KitchenQueueItem;
  mode: "kitchen" | "serving";
  busy: boolean;
  connected: boolean;
  onAction: (item: KitchenQueueItem, action: string) => void;
}) {
  return (
    <article className="panel kitchen-card">
      <div className="card-top">
        <span className="destination">{item.destination}</span>
        <StatusBadge status={item.status} />
      </div>
      <h2>
        {item.quantity} × {item.menuNameSnapshot}
      </h2>
      <p className="muted">
        {item.orderCode} · Đợt {item.sequenceNo}
        {item.sequenceNo > 1 ? " · GỌI THÊM" : ""}
      </p>
      {item.note && <p className="note">✎ {item.note}</p>}
      <div className="card-bottom">
        <small className="muted">{formatTime(item.eligibleAt)}</small>
        {mode === "serving" ? (
          <button
            className="primary"
            disabled={busy || !connected}
            onClick={() => onAction(item, "serve")}
          >
            {item.orderType === "TAKEAWAY" ? "Đã giao khách" : "Đã phục vụ"} ✓
          </button>
        ) : item.status !== "READY" ? (
          <button
            className="primary"
            disabled={busy || !connected}
            onClick={() =>
              onAction(
                item,
                item.status === "PLACED"
                  ? "accept"
                  : item.status === "ACCEPTED"
                    ? "prepare"
                    : "ready",
              )
            }
          >
            {item.status === "PLACED"
              ? "Tiếp nhận"
              : item.status === "ACCEPTED"
                ? "Bắt đầu nấu"
                : "Hoàn thành"}{" "}
            →
          </button>
        ) : (
          <span className="muted">Chờ nhân viên bàn giao</span>
        )}
      </div>
    </article>
  );
}

