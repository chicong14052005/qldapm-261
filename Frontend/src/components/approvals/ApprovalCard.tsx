"use client";
import { Check } from "lucide-react";
import { formatTime, money } from "@/lib/format";
import StatusBadge from "@/components/common/StatusBadge";
import type { ApprovalBatch } from "@/types/order";

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
    <article className="panel">
      <div className="card-top">
        <strong className="destination">{batch.destination}</strong>
        <StatusBadge status="PENDING" />
      </div>
      <h3>
        {batch.orderCode} · Đợt {batch.sequenceNo}
      </h3>
      <p className="muted">Gửi lúc {formatTime(batch.createdAt)}</p>
      {batch.items.map((i) => (
        <div className="approval-item" key={i.id}>
          <span>
            <strong>
              {i.quantity} × {i.menuNameSnapshot}
            </strong>
            <small>{i.note}</small>
          </span>
          <strong>{money(i.quantity * i.unitPriceVnd)}</strong>
        </div>
      ))}
      <div className="card-bottom">
        <button className="danger-btn" onClick={() => onReject(batch)}>
          Từ chối
        </button>
        <button
          type="button"
          className="primary"
          disabled={busy || !connected}
          onClick={() => onApprove(batch)}
        >
          <span>Duyệt toàn đợt</span>
          <Check size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

