"use client";
import StatusBadge from "@/components/common/StatusBadge";
import type { Order } from "@/types/order";

export default function OrderStatusTimeline({ order }: { order: Order | null }) {
  return (
    <div className="order-title">
      <span>▤</span>
      <div>
        <h2>
          {order?.tableCode
            ? `Bàn ${order.tableCode}`
            : order?.pickupCode ?? "Đơn mang về mới"}
        </h2>
        <small>{order?.code ?? "Chọn món để bắt đầu"}</small>
      </div>
      {order && <StatusBadge status={order.status} />}
    </div>
  );
}

