"use client";
import { useAuth } from "@/hooks/useAuth";
import EmptyState from "@/components/common/EmptyState";
import type { ApprovalBatch } from "@/types/order";
import ApprovalCard from "./ApprovalCard";
import styles from "./ApprovalQueue.module.css";

export default function ApprovalQueue() {
  const { data, busy, connected, ask, mutate, run, notify } = useAuth();
  const batches = data as ApprovalBatch[];
  const pendingItemCount = batches.reduce(
    (total, batch) =>
      total + batch.items.reduce((batchTotal, item) => batchTotal + item.quantity, 0),
    0,
  );

  return (
    <>
      <header className={styles.pageHeading}>
        <h1>Duyệt gọi thêm</h1>
        <p>Kiểm tra các món bổ sung trước khi chuyển xuống bếp.</p>
      </header>
      <section className={styles.metrics} aria-label="Thống kê yêu cầu gọi thêm">
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Yêu cầu mới</span>
          <strong className={styles.metricValue}>{batches.length}</strong>
          <span className={styles.metricHint}>Đang chờ duyệt</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Món chờ duyệt</span>
          <strong className={styles.metricValue}>{pendingItemCount}</strong>
          <span className={styles.metricHint}>Tổng số lượng trong các đợt</span>
        </div>
      </section>
      <div className={styles.queueHeading}>
        <h2>Yêu cầu cần xử lý</h2>
        <span className="muted">Duyệt toàn bộ đợt · Giữ giá khi khách gửi</span>
      </div>
      <div className={styles.queue}>
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

