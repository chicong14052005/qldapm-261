"use client";
import { Check } from "lucide-react";
import { formatTime, money } from "@/lib/format";
import type { ApprovalBatch } from "@/types/order";
import styles from "./ApprovalQueue.module.css";

export default function ApprovalCard({
  batch,
  busy,
  connected,
  onReject,
  onApprove,
}: {
  batch: ApprovalBatch;
  busy: boolean;
  connected: boolean;
  onReject: (batch: ApprovalBatch) => void;
  onApprove: (batch: ApprovalBatch) => void;
}) {
  return (
    <article className={styles.card}>
      <div className={styles.cardContent}>
        <div className={styles.cardHeader}>
          <strong className={styles.destination}>{batch.destination}</strong>
          <small className={styles.submittedAt}>Gửi lúc {formatTime(batch.createdAt)}</small>
        </div>
        <p className={styles.orderMeta}>
          {batch.orderCode} · Đợt {batch.sequenceNo}
        </p>
        <div className={styles.itemList}>
          {batch.items.map((item) => (
            <div className={styles.item} key={item.id}>
              <div className={styles.itemDetails}>
                <strong className={styles.itemName}>
                  {item.menuNameSnapshot} ×{item.quantity}
                </strong>
                <p className={styles.itemNote}>
                  {item.note ? `Ghi chú: ${item.note}` : "Không có ghi chú"}
                </p>
              </div>
              <strong className={styles.itemPrice}>
                {money(item.quantity * item.unitPriceVnd)}
              </strong>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={`danger-btn ${styles.rejectButton}`}
          disabled={busy || !connected}
          onClick={() => onReject(batch)}
        >
          Từ chối
        </button>
        <button
          type="button"
          className={`primary ${styles.approveButton}`}
          disabled={busy || !connected}
          onClick={() => onApprove(batch)}
        >
          <span>Duyệt</span>
          <Check size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

