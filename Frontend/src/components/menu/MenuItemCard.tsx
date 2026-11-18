"use client";
import { Minus, Plus } from "lucide-react";
import { money } from "@/lib/format";
import type { MenuItem } from "@/types/menu";
import styles from "./MenuItemCard.module.css";

export default function MenuItemCard({
  item,
  categoryName,
  cartQuantity = 0,
  orderedQuantity = 0,
  busy,
  canManage,
  onAdd,
  onDecrement,
  onEdit,
  onToggleAvailability,
  onToggleActive,
}: {
  item: MenuItem;
  categoryName?: string;
  cartQuantity?: number;
  orderedQuantity?: number;
  busy: boolean;
  canManage: boolean;
  onAdd: (item: MenuItem) => void;
  onDecrement: (item: MenuItem) => void;
  onEdit: (item: MenuItem) => void;
  onToggleAvailability: (item: MenuItem) => void;
  onToggleActive: (item: MenuItem) => void;
}) {
  const isUnavailable = !item.isAvailable || !item.isActive;
  const hasCartOrOrdered = cartQuantity > 0 || orderedQuantity > 0;

  return (
    <article
      className={`dish-card ${styles.card} ${
        cartQuantity > 0 ? styles.inCart : ""
      } ${isUnavailable ? `unavailable ${styles.unavailable}` : ""}`.trim()}
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
        <div className={styles.dishHeaderRow}>
          <span className="eyebrow">{categoryName}</span>
        </div>
        <h3>{item.name}</h3>
        <p>{item.description}</p>

        {hasCartOrOrdered && (
          <div className={styles.qtyBadges}>
            {cartQuantity > 0 && (
              <span className={styles.qtyBadgeCart}>
                Đang chọn: {cartQuantity}
              </span>
            )}
            {orderedQuantity > 0 && (
              <span className={styles.qtyBadgeOrdered}>
                Đã gọi: {orderedQuantity}
              </span>
            )}
          </div>
        )}

        <div className="dish-bottom">
          <strong>{money(item.priceVnd)}</strong>
          {cartQuantity > 0 ? (
            <div className={styles.dishStepper}>
              <button
                type="button"
                aria-label={`Giảm số lượng ${item.name}`}
                disabled={busy}
                onClick={() => onDecrement(item)}
              >
                <Minus size={16} strokeWidth={2.2} aria-hidden="true" />
              </button>
              <span aria-label={`Số lượng đã chọn: ${cartQuantity}`}>
                {cartQuantity}
              </span>
              <button
                type="button"
                aria-label={`Tăng số lượng ${item.name}`}
                disabled={isUnavailable || busy || cartQuantity >= 99}
                onClick={() => onAdd(item)}
              >
                <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="add-btn"
              aria-label={"Thêm " + item.name}
              disabled={isUnavailable || busy}
              onClick={() => onAdd(item)}
            >
              <Plus size={18} strokeWidth={2.2} aria-hidden="true" />
            </button>
          )}
        </div>

        {canManage && (
          <div className="card-links">
            <button
              type="button"
              className="text-btn"
              onClick={() => onEdit(item)}
            >
              Chỉnh sửa
            </button>
            <button
              type="button"
              className="text-btn"
              onClick={() => onToggleAvailability(item)}
            >
              {item.isAvailable ? "Báo hết" : "Mở bán"}
            </button>
            <button
              type="button"
              className="text-btn"
              onClick={() => onToggleActive(item)}
            >
              {item.isActive ? "Ẩn" : "Hiện"}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
