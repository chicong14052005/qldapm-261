"use client";
import { LogOut, Menu, Settings } from "lucide-react";
import { api } from "@/lib/api";
import { roleNames } from "@/config/roles";
import { useAuth } from "@/hooks/useAuth";
import BrandLogo from "@/components/common/BrandLogo";
import styles from "./AppHeader.module.css";

export default function AppHeader({
  title,
  onToggleMobileNav,
}: {
  title: string;
  onToggleMobileNav?: () => void;
}) {
  const { user, setUser, guest, ask, mutate, notify, logout } = useAuth();
  if (!user) return null;

  return (
    <header className={`topbar ${styles.header}`}>
      <div className="topbar-left">
        <button
          type="button"
          className="icon-btn mobile-menu-trigger"
          title="Mở menu điều hướng"
          aria-label="Mở menu điều hướng"
          onClick={onToggleMobileNav}
        >
          <Menu size={22} strokeWidth={2} aria-hidden="true" />
        </button>
        <a className="brand topbar-mobile-brand" href="/">
          <BrandLogo size={32} showText />
        </a>
        <div className="breadcrumb">
          Nhà hàng <span>/</span> <strong>{title}</strong>
        </div>
      </div>
      <div className="user-area">
        <span className="avatar">{user.displayName?.[0] ?? "K"}</span>
        <div>
          <strong>{user.displayName}</strong>
          <small>{user.roles.map((r) => roleNames[r]).join(", ")}</small>
        </div>
        {!guest && (
          <button
            type="button"
            className="icon-btn"
            title="Đổi mật khẩu"
            aria-label="Đổi mật khẩu"
            onClick={() =>
              ask(
                "Đổi mật khẩu",
                [
                  {
                    name: "currentPassword",
                    label: "Mật khẩu hiện tại",
                    type: "password",
                  },
                  {
                    name: "newPassword",
                    label: "Mật khẩu mới (ít nhất 12 ký tự)",
                    type: "password",
                  },
                ],
                async (v) => {
                  await mutate("/auth/change-password", v);
                  setUser(await api("/auth/me"));
                  notify("Đã đổi mật khẩu.");
                },
              )
            }
          >
            <Settings size={20} strokeWidth={1.9} aria-hidden="true" />
          </button>
        )}
        <button type="button" className="text-btn" onClick={logout}>
          <LogOut size={16} strokeWidth={2} aria-hidden="true" />
          Thoát
        </button>
      </div>
    </header>
  );
}
