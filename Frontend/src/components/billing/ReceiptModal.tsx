"use client";
import { dateTime } from "@/lib/date-time";
import { money } from "@/lib/format";
import { paymentMethodNames } from "@/config/status";
import type { Receipt } from "@/types/payment";

export default function ReceiptModal({
  receipt,
  onClose,
}: {
  receipt: Receipt;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal receipt"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="eyebrow">BẾP NHÀ · BIÊN NHẬN NỘI BỘ</span>
        <h2>Cảm ơn bạn đã dùng bữa!</h2>
        <p className="muted">
          {receipt.receiptNo} · {dateTime(receipt.paidAt)} (UTC+07:00)
        </p>
        {receipt.receivedBy && (
          <p className="muted">
            Người nhận: {receipt.receivedBy.displayName ?? "Chưa ghi nhận tên"}
            {receipt.receivedBy.username
              ? ` (${receipt.receivedBy.username})`
              : ""}
          </p>
        )}
        {receipt.order.batches
          .flatMap((b) => b.items)
          .filter((i) => i.status === "SERVED")
          .map((i) => (
            <div className="approval-item" key={i.id}>
              <span>
                {i.quantity} × {i.menuNameSnapshot}
              </span>
              <strong>{money(i.quantity * i.unitPriceVnd)}</strong>
            </div>
          ))}
        <div className="cart-total">
          <span>Tổng thanh toán</span>
          <strong>{money(receipt.amountVnd)}</strong>
        </div>
        <p>
          {paymentMethodNames[receipt.method] ?? receipt.method}
          {receipt.changeVnd != null
            ? ` · Tiền thừa: ${money(receipt.changeVnd)}`
            : ""}
        </p>
        <button className="primary wide" onClick={onClose}>
          Hoàn tất
        </button>
      </section>
    </div>
  );
}

