"use client";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { formatTime, money } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";
import type { Order } from "@/types/order";

export default function OrderDetailPanel({
  mode = "orders",
}: {
  mode?: "orders" | "billing";
}) {
  const { data, history, setHistory, selectOrder, payForm, run, setReceipt } =
    useAuth();
  const orders = data as Order[];
  const isBilling = mode === "billing";

  return (
    <>
      <div className="section-bar">
        <h2>
          {isBilling ? "Đơn sẵn sàng thu tiền" : "Danh sách đơn"}{" "}
          <small>{orders.length} đơn</small>
        </h2>
        {!isBilling && (
          <select value={history} onChange={(e) => setHistory(e.target.value)}>
            <option value="">Đang hoạt động</option>
            <option value="PAID">Đã thanh toán</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        )}
      </div>
      <div className="order-cards">
        {orders.map((o) => (
          <article className="panel" key={o.id}>
            <div className="card-top">
              <span className="eyebrow">
                {o.orderType === "DINE_IN" ? "TẠI BÀN" : "MANG VỀ"}
              </span>
              <StatusBadge status={o.status} />
            </div>
            <h2>{o.tableCode ?? o.pickupCode}</h2>
            <p className="muted">
              {o.code} · {formatTime(o.createdAt)}
            </p>
            {o.pickupName && <p>{o.pickupName}</p>}
            <div className="card-bottom">
              <strong>
                {o.totalVnd != null ? money(o.totalVnd) : "Chưa chốt tiền"}
              </strong>
              <button
                type="button"
                className="secondary"
                onClick={() => selectOrder(o.id)}
              >
                <span>Chi tiết</span>
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            {isBilling && (
              <button className="primary wide" onClick={() => payForm(o)}>
                Xác nhận nhận tiền
              </button>
            )}
            {o.status === "PAID" && (
              <button
                className="text-btn"
                onClick={() =>
                  run(async () =>
                    setReceipt(await api(`/orders/${o.id}/receipt`)),
                  )
                }
              >
                Xem biên nhận
              </button>
            )}
          </article>
        ))}
      </div>
      {orders.length === 0 && (
        <EmptyState
          text={
            isBilling
              ? "Chưa có đơn chờ thanh toán."
              : "Chưa có đơn trong danh sách này."
          }
        />
      )}
    </>
  );
}

