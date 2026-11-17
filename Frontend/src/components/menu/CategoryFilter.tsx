"use client";
import type { Category } from "@/types/menu";

export default function CategoryFilter({
  categories,
  totalItemsCount,
  selectedCategory,
  onSelectCategory,
}: {
  categories: Category[];
  totalItemsCount: number;
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}) {
  return (
    <div className="chips">
      <button
        className={selectedCategory === "all" ? "selected" : ""}
        onClick={() => onSelectCategory("all")}
      >
        Tất cả món <small>{totalItemsCount}</small>
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          className={selectedCategory === c.id ? "selected" : ""}
          onClick={() => onSelectCategory(c.id)}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}

