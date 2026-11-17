"use client";
import { money } from "@/lib/format";
import type { MenuItem } from "@/types/menu";
import styles from "./MenuItemCard.module.css";

export default function MenuItemCard({
  item,
  categoryName,
  busy,
  canManage,
  onAdd,
  onEdit,
  onToggleAvailability,
  onToggleActive,
}: {
  item: MenuItem;
  categoryName?: string;
  busy: boolean;
  canManage: boolean;
  onAdd: (item: MenuItem) => void;
  onEdit: (item: MenuItem) => void;
  onToggleAvailability: (item: MenuItem) => void;
  onToggleActive: (item: MenuItem) => void;
}) {
  const isUnavailable = !item.isAvailable || !item.isActive;
  return (
    <article
      className={`dish-card ${styles.card} ${
        isUnavailable ? `unavailable ${styles.unavailable}` : ""
      }`.trim()}
    >
      <div className="dish-image">
        <img
          src={item.imageUrl}
          alt={item.name}
          onError={(e) => {
            e.currentTarget.src = "/menu/placeholder.svg";
          }}
        />
        {!item.isAvailable && <span className="dish-status">Tạm hết món</span>}
        {!item.isActive && <span className="dish-status">Đang ẩn</span>}
      </div>
      <div className="dish-body">
        <span className="eyebrow">{categoryName}</span>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <div className="dish-bottom">
          <strong>{money(item.priceVnd)}</strong>
          <button
            className="add-btn"
            aria-label={"Thêm " + item.name}
            disabled={isUnavailable || busy}
            onClick={() => onAdd(item)}
          >
            ＋
          </button>
        </div>
        {canManage && (
          <div className="card-links">
            <button className="text-btn" onClick={() => onEdit(item)}>
              Chỉnh sửa
            </button>
            <button
              className="text-btn"
              onClick={() => onToggleAvailability(item)}
            >
              {item.isAvailable ? "Báo hết" : "Mở bán"}
            </button>
            <button className="text-btn" onClick={() => onToggleActive(item)}>
              {item.isActive ? "Ẩn" : "Hiện"}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

