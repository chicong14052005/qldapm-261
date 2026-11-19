"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import EmptyState from "@/components/common/EmptyState";
import type { Order } from "@/types/order";
import styles from "./BillingPanel.module.css";

function destination(order: Order) {
  if (order.orderType === "DINE_IN") {
    return order.tableCode ? `Bàn ${order.tableCode}` : "Tại bàn";
  }

  return order.pickupCode ? `Mang về · ${order.pickupCode}` : "Mang về";
}

export default function BillingPanel() {
  const { data, payForm } = useAuth();
  const orders = data as Order[];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    if (orders.length === 0) {
      setSelectedId(null);
      setDetail(null);
      return;
    }

    if (!selectedId || !orders.some((order) => order.id === selectedId)) {
      setSelectedId(orders[0].id);
    }
  }, [orders, selectedId]);

  useEffect(() => {
    if (!selectedId) return;

    let active = true;
    setDetail(null);
    setDetailLoading(true);
    setDetailError("");
    api<Order>(`/orders/${selectedId}`)
      .then((order) => {
        if (active) setDetail(order);
      })
      .catch((error) => {
        if (active) {
          setDetail(null);
          setDetailError(error.message);
        }
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedId]);

  const selectedSummary =
    orders.find((order) => order.id === selectedId) ?? null;
  const selectedOrder = detail?.id === selectedId ? detail : selectedSummary;
  const payableItems = useMemo(
    () =>
      detail?.batches
        ?.flatMap((batch) => batch.items)
        .filter((item) => item.status === "SERVED") ?? [],
    [detail],
  );

  if (orders.length === 0) {
    return <EmptyState text="Chưa có đơn chờ thanh toán." />;
  }

  return (
    <section className={styles.billing} aria-label="Các đơn đang chờ thanh toán">
      <h2 className={styles.sectionTitle}>Đang chờ thanh toán</h2>
      <div className={styles.layout}>
        <div className={styles.orderList}>
          {orders.map((order) => {
            const selected = order.id === selectedId;
            return (
              <button
                key={order.id}
                type="button"
                className={`${styles.orderCard} ${selected ? styles.selected : ""}`}
                onClick={() => setSelectedId(order.id)}
                aria-pressed={selected}
              >
                <strong>#{order.code}</strong>
                <span>{destination(order)}</span>
                <b>
                  {order.totalVnd != null
                    ? money(order.totalVnd)
                    : "Chưa chốt tiền"}
                </b>
              </button>
            );
          })}
        </div>

        <aside className={styles.receipt} aria-live="polite">
          <h2>Chi tiết thanh toán</h2>
          {selectedOrder && (
            <p className={styles.receiptMeta}>
              Đơn #{selectedOrder.code} · {destination(selectedOrder)}
            </p>
          )}

          <div className={styles.divider} />

          {detailLoading && (
            <p className={styles.state}>Đang tải chi tiết đơn…</p>
          )}
          {detailError && <div className="alert error">{detailError}</div>}
          {!detailLoading && !detailError && (
            <div className={styles.items}>
              {payableItems.map((item) => (
                <div className={styles.item} key={item.id}>
                  <span>
                    {item.menuNameSnapshot} ×{item.quantity}
                  </span>
                  <strong>{money(item.quantity * item.unitPriceVnd)}</strong>
                </div>
              ))}
              {payableItems.length === 0 && (
                <p className={styles.state}>Đơn không có dòng món tính tiền.</p>
              )}
            </div>
          )}

          <div className={styles.total}>
            <span>Tổng thanh toán</span>
            <strong>
              {selectedOrder?.totalVnd != null
                ? money(selectedOrder.totalVnd)
                : "—"}
            </strong>
          </div>
          <p className={styles.note}>Thu ngân xác nhận sau khi nhận đủ tiền.</p>
          <button
            type="button"
            className={`primary ${styles.confirm}`}
            disabled={!selectedOrder || detailLoading}
            onClick={() => selectedOrder && payForm(selectedOrder)}
          >
            Xác nhận thanh toán
          </button>
        </aside>
      </div>
    </section>
  );
}

