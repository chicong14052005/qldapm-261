"use client";
import { ArrowDown, Plus, Search, ShoppingBag } from "lucide-react";
import { money } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import type { MenuItem } from "@/types/menu";
import CategoryFilter from "./CategoryFilter";
import MenuItemCard from "./MenuItemCard";
import { buildCreateCategoryFields } from "./MenuItemFormModal";
import OrderCart from "@/components/orders/OrderCart";

export default function MenuCatalog() {
  const {
    menu,
    order,
    cart,
    setCart,
    category,
    setCategory,
    search,
    setSearch,
    guest,
    busy,
    has,
    ask,
    mutate,
    run,
    addToCart,
    editMenu,
  } = useAuth();

  const canManage = has("MANAGER", "ADMIN") && !guest;
  const filteredItems = menu.items.filter(
    (m) =>
      (category === "all" || m.categoryId === category) &&
      m.name.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")),
  );

  const cartQtyById = new Map<string, number>();
  for (const c of cart) {
    cartQtyById.set(c.menuItemId, (cartQtyById.get(c.menuItemId) ?? 0) + c.quantity);
  }

  const orderedQtyById = new Map<string, number>();
  if (order?.batches) {
    for (const batch of order.batches) {
      if (batch.status === "REJECTED" || batch.status === "WITHDRAWN") continue;
      for (const item of batch.items) {
        if (
          !item.menuItemId ||
          item.status === "CANCELLED" ||
          item.status === "REJECTED"
        ) {
          continue;
        }
        orderedQtyById.set(
          item.menuItemId,
          (orderedQtyById.get(item.menuItemId) ?? 0) + item.quantity,
        );
      }
    }
  }

  const decrementCartItem = (item: MenuItem) => {
    setCart((old) =>
      old.flatMap((x) => {
        if (x.menuItemId !== item.id) return [x];
        if (x.quantity <= 1) return [];
        return [{ ...x, quantity: x.quantity - 1 }];
      }),
    );
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartVnd = cart.reduce(
    (sum, item) => sum + item.quantity * item.observedPriceVnd,
    0,
  );

  const scrollToCart = () => {
    document
      .getElementById("order-cart-panel")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <div className="menu-toolbar">
        <div className="search">
          <span className="search-icon" aria-hidden="true">
            <Search size={18} strokeWidth={1.9} />
          </span>
          <input
            placeholder="Tìm món ăn bạn muốn…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canManage && (
          <div className="heading-actions">
            <button
              type="button"
              className="secondary"
              onClick={() =>
                ask("Thêm danh mục", buildCreateCategoryFields(), async (v) => {
                  await mutate("/menu-categories", v);
                })
              }
            >
              <Plus size={18} strokeWidth={2} aria-hidden="true" />
              Danh mục
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => editMenu()}
            >
              <Plus size={18} strokeWidth={2} aria-hidden="true" />
              Thêm món
            </button>
          </div>
        )}
      </div>
      <CategoryFilter
        categories={menu.categories}
        totalItemsCount={menu.items.length}
        selectedCategory={category}
        onSelectCategory={setCategory}
      />
      <div className="ordering-layout">
        <div className="menu-grid">
          {filteredItems.map((m) => (
            <MenuItemCard
              key={m.id}
              item={m}
              categoryName={
                menu.categories.find((c) => c.id === m.categoryId)?.name
              }
              cartQuantity={cartQtyById.get(m.id) ?? 0}
              orderedQuantity={orderedQtyById.get(m.id) ?? 0}
              busy={busy}
              canManage={canManage}
              onAdd={addToCart}
              onDecrement={decrementCartItem}
              onEdit={editMenu}
              onToggleAvailability={(item) =>
                run(async () => {
                  await mutate(
                    `/menu-items/${item.id}/availability`,
                    {
                      expectedVersion: item.version,
                      isAvailable: !item.isAvailable,
                    },
                    "PATCH",
                  );
                })
              }
              onToggleActive={(item) =>
                run(async () => {
                  await mutate(
                    `/menu-items/${item.id}`,
                    {
                      expectedVersion: item.version,
                      isActive: !item.isActive,
                    },
                    "PATCH",
                  );
                })
              }
            />
          ))}
        </div>
        <OrderCart />
      </div>

      {totalCartCount > 0 && (
        <div className="mobile-cart-bar" role="region" aria-label="Giỏ gọi món hiện tại">
          <div className="mobile-cart-summary">
            <ShoppingBag size={18} strokeWidth={2} aria-hidden="true" />
            <div>
              <strong>{totalCartCount} món đang chọn</strong>
              <small>{money(totalCartVnd)}</small>
            </div>
          </div>
          <button
            type="button"
            className="mobile-cart-jump"
            onClick={scrollToCart}
          >
            <span>Xem giỏ</span>
            <ArrowDown size={15} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
