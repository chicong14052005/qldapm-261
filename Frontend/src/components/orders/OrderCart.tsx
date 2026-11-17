"use client";
import { money } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import OrderStatusTimeline from "./OrderStatusTimeline";
import OrderItemList from "./OrderItemList";
import styles from "./OrderCart.module.css";

export default function OrderCart() {
  const {
    order,
    cart,
    setCart,
    busy,
    connected,
    pending,
    guest,
    has,
    ask,
    mutate,
    run,
    notify,
    addToCart,
    sendCart,
    payForm,
    setOrderId,
    setOrder,
  } = useAuth();

  return (
    <aside className={`order-panel ${styles.panel}`}>
      <OrderStatusTimeline order={order} />
      {order && <OrderItemList batches={order.batches} />}
      <div className="cart-area">
        <h3>
          {order ? "Gọi thêm món" : "Món đã chọn"}{" "}
          <small>{cart.reduce((n, i) => n + i.quantity, 0)}</small>
        </h3>
        {cart.length === 0 ? (
          <div className="empty-cart">
            <span>♧</span>
            <p>Chọn một món ngon từ thực đơn</p>
          </div>
        ) : (
          cart.map((i) => (
            <div className="cart-line" key={i.menuItemId}>
              <div className="cart-line-title">
                <strong>{i.name}</strong>
                <button
                  className="text-btn"
                  onClick={() =>
                    setCart((c) =>
                      c.filter((x) => x.menuItemId !== i.menuItemId),
                    )
                  }
                >
                  ×
                </button>
              </div>
              <div className="cart-line-bottom">
                <div className="stepper">
                  <button
                    onClick={() =>
                      setCart((c) =>
                        c.map((x) =>
                          x.menuItemId === i.menuItemId
                            ? { ...x, quantity: Math.max(1, x.quantity - 1) }
                            : x,
                        ),
                      )
                    }
                  >
                    −
                  </button>
                  <span>{i.quantity}</span>
                  <button onClick={() => addToCart({ id: i.menuItemId })}>
                    ＋
                  </button>
                </div>
                <strong>{money(i.quantity * i.observedPriceVnd)}</strong>
              </div>
              <input
                className="note-input"
                placeholder="Ghi chú: ít cay, không hành…"
                value={i.note}
                onChange={(e) =>
                  setCart((c) =>
                    c.map((x) =>
                      x.menuItemId === i.menuItemId
                        ? { ...x, note: e.target.value }
                        : x,
                    ),
                  )
                }
              />
            </div>
          ))
        )}
      </div>
      <div className="cart-summary">
        {order && (
          <>
            <div>
              <span>Đã gửi / được duyệt</span>
              <strong>{money(order.subtotalVnd)}</strong>
            </div>
            {order.pendingVnd > 0 && (
              <div>
                <span>Đang chờ phê duyệt</span>
                <strong>{money(order.pendingVnd)}</strong>
              </div>
            )}
          </>
        )}
        <div className="cart-total">
          <span>{order ? "Đợt gọi mới" : "Tạm tính"}</span>
          <strong>
            {money(
              cart.reduce((s, i) => s + i.quantity * i.observedPriceVnd, 0),
            )}
          </strong>
        </div>
        <button
          className="primary wide"
          disabled={
            cart.length === 0 ||
            busy ||
            !connected ||
            Boolean(pending) ||
            Boolean(order && order.status !== "SERVING")
          }
          onClick={sendCart}
        >
          {busy
            ? "Đang gửi…"
            : order?.batches.length
              ? "Gửi gọi thêm · Chờ phê duyệt"
              : "Gửi món xuống bếp"}{" "}
          →
        </button>
        {order?.status === "SERVING" && (
          <>
            <button
              className="secondary wide"
              disabled={busy || !connected}
              onClick={() =>
                run(async () => {
                  await mutate(`/orders/${order.id}/request-payment`, {
                    expectedVersion: order.version,
                  });
                  notify("Đơn đã chuyển sang chờ thanh toán.");
                })
              }
            >
              Yêu cầu thanh toán
            </button>
            {!guest && (
              <button
                className="text-btn danger"
                onClick={() =>
                  ask(
                    "Hủy đơn / đóng lượt trống",
                    [{ name: "reason", label: "Lý do" }],
                    async (v) => {
                      await mutate(`/orders/${order.id}/cancel`, {
                        expectedVersion: order.version,
                        reason: v.reason,
                      });
                      setOrderId(null);
                      setOrder(null);
                      notify("Đã hủy đơn.");
                    },
                  )
                }
              >
                Hủy toàn đơn
              </button>
            )}
          </>
        )}
        {order?.status === "AWAITING_PAYMENT" &&
          has("CASHIER", "MANAGER", "ADMIN") && (
            <>
              <button className="primary wide" onClick={() => payForm(order)}>
                Thu {money(order.totalVnd)}
              </button>
              <button
                className="text-btn"
                onClick={() =>
                  ask(
                    "Mở lại đơn để gọi thêm",
                    [{ name: "reason", label: "Lý do" }],
                    async (v) => {
                      await mutate(`/orders/${order.id}/reopen`, {
                        reason: v.reason,
                        expectedVersion: order.version,
                      });
                    },
                  )
                }
              >
                Mở lại đơn
              </button>
            </>
          )}
        <p className="cart-footnote">
          Giá đã bao gồm toàn bộ chi phí. Đợt gọi thêm cần được phê duyệt.
        </p>
      </div>
    </aside>
  );
}

