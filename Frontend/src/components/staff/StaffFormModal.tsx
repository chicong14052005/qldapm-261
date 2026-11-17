import type { FormField } from "@/types/api";
import type { StaffMember } from "@/types/auth";

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
      name: "role",
      label: "Vai trò",
      type: "select",
      options: ["WAITER", "KITCHEN", "CASHIER", "MANAGER", "ADMIN"],
    },
  ];
}

export function buildChangeRolesFields(staff: StaffMember): FormField[] {
  return [
    {
      name: "roles",
      label: "Role, cách nhau bởi dấu phẩy",
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

