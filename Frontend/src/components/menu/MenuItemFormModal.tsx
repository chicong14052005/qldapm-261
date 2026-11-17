import type { FormField } from "@/types/api";

export function buildCreateCategoryFields(): FormField[] {
  return [
    { name: "code", label: "Mã danh mục", value: "CAT-5" },
    { name: "name", label: "Tên danh mục", value: "Tráng miệng" },
  ];
}

export default function MenuItemFormModal() {
  return null;
}

