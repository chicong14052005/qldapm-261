"use client";
import { LayoutGrid, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { padStatNumber } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import type { Table } from "@/types/table";
import TableCard from "./TableCard";
import { buildCreateTableFields, buildEditTableFields } from "./TableFormModal";

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="stat">
      <div>
        <span>{label}</span>
        <strong>{padStatNumber(value)}</strong>
        <small>{detail}</small>
      </div>
      <span className="stat-icon" aria-hidden="true">
        <LayoutGrid size={20} strokeWidth={1.9} />
      </span>
    </article>
  );
}

export default function TableGrid() {
  const {
    data,
    busy,
    connected,
    has,
    ask,
    mutate,
    notify,
    run,
    selectOrder,
    openTable,
    setTableQr,
  } = useAuth();

  const tables = data as Table[];
  const canManage = has("MANAGER", "ADMIN");
  const canUnlockQr = has("WAITER", "MANAGER", "ADMIN");

  return (
    <>
      <div className="stats">
        <Stat
          label="Tổng số bàn"
          value={tables.length}
          detail="Sẵn sàng đón khách"
        />
        <Stat
          label="Đang phục vụ"
          value={tables.filter((t) => t.visit).length}
          detail="Lượt khách đang mở"
        />
        <Stat
          label="Bàn còn trống"
          value={tables.filter((t) => !t.visit && t.isActive).length}
          detail="Có thể mở lượt mới"
        />
      </div>
      <div className="section-bar">
        <h2>
          Sơ đồ bàn ăn <small>{tables.length} bàn</small>
        </h2>
        {canManage && (
          <button
            type="button"
            className="secondary"
            onClick={() =>
              ask("Thêm bàn", buildCreateTableFields(), async (v) => {
                await mutate("/tables", {
                  ...v,
                  capacity: Number(v.capacity),
                });
              })
            }
          >
            <Plus size={18} strokeWidth={2} aria-hidden="true" />
            Thêm bàn
          </button>
        )}
      </div>
      <div className="tables-grid">
        {tables.map((t) => (
          <TableCard
            key={t.id}
            table={t}
            busy={busy}
            connected={connected}
            canManage={canManage}
            canUnlockQr={canUnlockQr}
            onSelectOrder={selectOrder}
            onOpenTable={openTable}
            onViewQr={(table) =>
              run(async () => {
                setTableQr(await api(`/tables/${table.id}/qr`));
              })
            }
            onUnlockQr={(table) =>
              ask(
                `Mở khóa QR bàn ${table.code}`,
                [],
                async () => {
                  await mutate(`/tables/${table.id}/qr/unlock`, {});
                  notify(
                    `Đã thu hồi phiên khách cũ của bàn ${table.code}. Một thiết bị mới tại bàn có thể quét QR ngay.`,
                  );
                },
                "Phiên của thiết bị đang giữ bàn sẽ bị thu hồi nhưng đơn và các món đã gọi vẫn giữ nguyên, để một thiết bị khác tại bàn quét lại QR.",
              )
            }
            onEditTable={(table) =>
              ask("Chỉnh sửa bàn", buildEditTableFields(table), async (v) => {
                await mutate(
                  `/tables/${table.id}`,
                  {
                    ...v,
                    capacity: Number(v.capacity),
                    isActive: v.isActive === "true",
                    expectedVersion: table.version,
                  },
                  "PATCH",
                );
              })
            }
          />
        ))}
      </div>
    </>
  );
}

