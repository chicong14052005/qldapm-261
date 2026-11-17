export type Role = "ADMIN" | "MANAGER" | "WAITER" | "KITCHEN" | "CASHIER" | "CUSTOMER";

export type User = {
  id: string;
  username?: string;
  displayName: string;
  roles: string[];
  isGuest?: boolean;
  isActive?: boolean;
  mustChangePassword?: boolean;
  version?: number;
};

export type StaffMember = {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
  isActive: boolean;
  version: number;
};

