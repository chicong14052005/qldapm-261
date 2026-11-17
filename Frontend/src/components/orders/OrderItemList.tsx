"use client";
import { money } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import StatusBadge from "@/components/common/StatusBadge";
import type { OrderBatch } from "@/types/order";

export default function OrderItemList({ batches }: { batches: OrderBatch[] }) {
  const { guest, has, ask, mutate, run, itemCommand } = useAuth();
  const canManage = has("MANAGER", "ADMIN") && !guest;

  return (
    <div className="existing-order">
      {batches.map((batch) => (
        <section key={batch.id} className="batch">
          <div className="batch-heading">
            <strong>Đợt {batch.sequenceNo}</strong>
            <StatusBadge status={batch.status} />
          </div>
          {batch.decisionReason && (
            <p className="reason">{batch.decisionReason}</p>
          )}
          {batch.items.map((i) => (
            <div className="order-line" key={i.id}>
              <div>
                <strong>
                  {i.quantity} × {i.menuNameSnapshot}
                </strong>
                <small>{i.note}</small>
                <StatusBadge status={i.status} />
              </div>
              <div>
                <span>{money(i.quantity * i.unitPriceVnd)}</span>
                {["PLACED", "ACCEPTED"].includes(i.status) && (
                  <div className="line-actions">
                    <button
                      onClick={() =>
                        ask(
                          "Điều chỉnh món",
                          [
                            {
                              name: "quantity",
                              label: "Số lượng (chỉ giảm)",
                              type: "number",
                              value: i.quantity,
                            },
                            {
                              name: "note",
                              label: "Ghi chú",
                              value: i.note ?? "",
                              required: false,
                            },
                          ],
                          async (v) => {
                            await mutate(
                              `/order-items/${i.id}`,
                              {
                                quantity: Number(v.quantity),
                                note: v.note || null,
                                expectedVersion: i.version,
                              },
                              "PATCH",
                            );
                          },
                        )
                      }
                    >
                      Sửa
                    </button>
                    <button onClick={() => itemCommand(i, "cancel")}>
                      Hủy
                    </button>
                  </div>
                )}
                {["PREPARING", "READY"].includes(i.status) && canManage && (
                  <button
                    className="text-btn danger"
                    onClick={() =>
                      ask(
                        "Hủy ngoại lệ",
                        [{ name: "reason", label: "Lý do hủy bắt buộc" }],
                        async (v) => {
                          await mutate(`/order-items/${i.id}/cancel`, {
                            expectedVersion: i.version,
                            reason: v.reason,
                          });
                        },
                      )
                    }
                  >
                    Hủy ngoại lệ
                  </button>
                )}
              </div>
            </div>
          ))}
          {batch.status === "PENDING" && (
            <button
              className="text-btn danger"
              onClick={() =>
                run(async () => {
                  await mutate(`/batches/${batch.id}/withdraw`, {
                    expectedVersion: batch.version,
                  });
                })
              }
            >
              Rút đợt gọi này
            </button>
          )}
        </section>
      ))}
    </div>
  );
}

