"use client";
import { ArrowRight, Check, StickyNote } from "lucide-react";
import { formatTime } from "@/lib/format";
import StatusBadge from "@/components/common/StatusBadge";
import type { KitchenQueueItem } from "@/types/order";
import styles from "./KitchenBoard.module.css";

const WAITING_AFTER_MINUTES = 5;
const LATE_AFTER_MINUTES = 15;
const statusLabels: Record<string, string> = {
  PLACED: "Chờ tiếp nhận",
  ACCEPTED: "Đã tiếp nhận",
  PREPARING: "Đang nấu",
  READY: "Sẵn sàng giao",
};
const statusClasses: Record<string, string> = {
  PLACED: styles.placedStatus,
  ACCEPTED: styles.acceptedStatus,
  PREPARING: styles.preparingStatus,
  READY: styles.readyStatus,
};
const ageClasses: Record<string, string> = {
  new: styles.ageNew,
  waiting: styles.ageWaiting,
  late: styles.ageLate,
  unknown: "",
};

export function getKitchenWaitAge(eligibleAt: string) {
  const timestamp = Date.parse(eligibleAt);
  if (!Number.isFinite(timestamp)) {
    return { minutes: null, label: "Thời gian không rõ", urgency: "unknown" as const, isLate: false };
  }

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes >= LATE_AFTER_MINUTES) {
    return { minutes, label: `Trễ · ${minutes} phút`, urgency: "late" as const, isLate: true };
  }
  if (minutes >= WAITING_AFTER_MINUTES) {
    return { minutes, label: `Đang chờ · ${minutes} phút`, urgency: "waiting" as const, isLate: false };
  }
  return { minutes, label: `Mới · ${minutes} phút`, urgency: "new" as const, isLate: false };
}

export default function KitchenTicketCard({ item, mode, busy, connected, onAction }: { item: KitchenQueueItem; mode: "kitchen" | "serving"; busy: boolean; connected: boolean; onAction: (item: KitchenQueueItem, action: string) => void; }) {
  const waitAge = mode === "kitchen" ? getKitchenWaitAge(item.eligibleAt) : null;
  const statusLabel = statusLabels[item.status];
  const statusClass = statusClasses[item.status];
  const ageClass = waitAge ? ageClasses[waitAge.urgency] : undefined;

  return (
    <article className={`panel kitchen-card ${styles.ticket} ${waitAge?.isLate ? styles.lateTicket : ""}`}>
      <div className="card-top">
        <span className={styles.destination}>{item.destination}</span>
        {mode === "kitchen" && statusLabel && statusClass ? (
          <span className={`${styles.itemStatus} ${statusClass}`}>{statusLabel}</span>
        ) : (
          <StatusBadge status={item.status} />
        )}
      </div>
      <h2 className={styles.ticketTitle}>{item.quantity} × {item.menuNameSnapshot}</h2>
      <p className={styles.ticketMeta}>{item.orderCode} · Đợt {item.sequenceNo}{item.sequenceNo > 1 ? " · GỌI THÊM" : ""}</p>
      {item.note && <p className={`${styles.note} note`}><StickyNote size={16} strokeWidth={2} aria-hidden="true" /><span>{item.note}</span></p>}
      <div className={`${styles.ticketFooter} card-bottom`}>
        <div className={styles.timeDetails}>
          {waitAge && <span className={`${styles.waitAge} ${ageClass ?? ""}`}>{waitAge.label}</span>}
          <small className={styles.ticketTime}>Vào bếp: {formatTime(item.eligibleAt)}</small>
        </div>
        {mode === "serving" ? (
          <button type="button" className="primary" disabled={busy || !connected} onClick={() => onAction(item, "serve")}><span>{item.orderType === "TAKEAWAY" ? "Đã giao khách" : "Đã phục vụ"}</span><Check size={16} strokeWidth={2.2} aria-hidden="true" /></button>
        ) : item.status !== "READY" ? (
          <button type="button" className="primary" disabled={busy || !connected} onClick={() => onAction(item, item.status === "PLACED" ? "accept" : item.status === "ACCEPTED" ? "prepare" : "ready")}><span>{item.status === "PLACED" ? "Tiếp nhận" : item.status === "ACCEPTED" ? "Bắt đầu nấu" : "Hoàn thành"}</span><ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" /></button>
        ) : <span className={styles.readyMessage}>Đang chờ phục vụ</span>}
      </div>
    </article>
  );
}
