import type { FormField } from "@/types/api";
import type { StaffMember } from "@/types/auth";

const STAFF_ROLE_OPTIONS = ["WAITER", "KITCHEN", "CASHIER", "MANAGER", "ADMIN"];

export function buildCreateStaffFields(): FormField[] {
  return [
    { name: "username", label: "Tên đăng nhập", value: "phucvu02" },
    { name: "displayName", label: "Họ tên", value: "Nguyễn Minh Anh" },
    {
      name: "initialPassword",
      label: "Mật khẩu tạm (ít nhất 12 ký tự)",
      type: "password",
    },
    {
      name: "roles",
      label: "Vai trò (chọn một hoặc nhiều)",
      type: "checkboxes",
      options: STAFF_ROLE_OPTIONS,
      value: "WAITER",
    },
  ];
}

export function buildChangeRolesFields(staff: StaffMember): FormField[] {
  return [
    {
      name: "roles",
      label: "Vai trò (chọn một hoặc nhiều)",
      type: "checkboxes",
      options: STAFF_ROLE_OPTIONS,
      value: staff.roles.join(","),
    },
  ];
}

export function buildResetPasswordFields(): FormField[] {
  return [
    {
      name: "temporaryPassword",
      label: "Mật khẩu tạm mới",
      type: "password",
    },
  ];
}

export default function StaffFormModal() {
  return null;
}

