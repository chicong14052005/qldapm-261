"use client";
import { useAuth } from "@/hooks/useAuth";
import EmptyState from "@/components/common/EmptyState";
import type { ApprovalBatch } from "@/types/order";
import ApprovalCard from "./ApprovalCard";

export default function ApprovalQueue() {
  const { data, busy, connected, ask, mutate, run, notify } = useAuth();
  const batches = data as ApprovalBatch[];

  return (
    <>
      <div className="section-bar">
        <h2>
          Đợt gọi thêm chờ duyệt <small>{batches.length} đợt</small>
        </h2>
        <span className="muted">Duyệt toàn bộ đợt · Giữ giá khi khách gửi</span>
      </div>
      <div className="order-cards">
        {batches.map((b) => (
          <ApprovalCard
            key={b.id}
            batch={b}
            busy={busy}
            connected={connected}
            onReject={(batch) =>
              ask(
                "Từ chối đợt gọi thêm",
                [{ name: "reason", label: "Lý do từ chối" }],
                async (v) => {
                  await mutate(`/batches/${batch.id}/reject`, {
                    expectedVersion: batch.version,
                    reason: v.reason,
                  });
                },
              )
            }
            onApprove={(batch) =>
              run(async () => {
                await mutate(`/batches/${batch.id}/approve`, {
                  expectedVersion: batch.version,
                });
                notify("Đã duyệt và chuyển món xuống bếp.");
              })
            }
          />
        ))}
      </div>
      {batches.length === 0 && (
        <EmptyState text="Không có đợt gọi thêm nào đang chờ phê duyệt." />
      )}
    </>
  );
}

