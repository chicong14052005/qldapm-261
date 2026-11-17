import type { FormField } from "@/types/api";
import type { Table } from "@/types/table";

export function buildCreateTableFields(): FormField[] {
  return [
    { name: "code", label: "Mã bàn", value: "B31" },
    { name: "capacity", label: "Sức chứa", type: "number", value: 4 },
  ];
}

export function buildEditTableFields(table: Table): FormField[] {
  return [
    { name: "code", label: "Mã bàn", value: table.code },
    { name: "capacity", label: "Sức chứa", type: "number", value: table.capacity },
    {
      name: "isActive",
      label: "Hoạt động",
      type: "select",
      options: ["true", "false"],
      value: String(table.isActive),
    },
  ];
}

export default function TableFormModal() {
  return null;
}

