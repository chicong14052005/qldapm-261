"use client";
import { useAuth } from "@/hooks/useAuth";
import CategoryFilter from "./CategoryFilter";
import MenuItemCard from "./MenuItemCard";
import { buildCreateCategoryFields } from "./MenuItemFormModal";
import OrderCart from "@/components/orders/OrderCart";

export default function MenuCatalog() {
  const {
    menu,
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

  return (
    <>
      <div className="menu-toolbar">
        <div className="search">
          <span>⌕</span>
          <input
            placeholder="Tìm món ăn bạn muốn…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canManage && (
          <div className="heading-actions">
            <button
              className="secondary"
              onClick={() =>
                ask("Thêm danh mục", buildCreateCategoryFields(), async (v) => {
                  await mutate("/menu-categories", v);
                })
              }
            >
              ＋ Danh mục
            </button>
            <button className="primary" onClick={() => editMenu()}>
              ＋ Thêm món
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
              busy={busy}
              canManage={canManage}
              onAdd={addToCart}
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
    </>
  );
}

