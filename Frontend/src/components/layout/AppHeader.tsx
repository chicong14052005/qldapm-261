"use client";
import { api } from "@/lib/api";
import { roleNames } from "@/config/roles";
import { useAuth } from "@/hooks/useAuth";
import styles from "./AppHeader.module.css";

export default function AppHeader({ title }: { title: string }) {
  const { user, setUser, guest, ask, mutate, notify, logout } = useAuth();
  if (!user) return null;

  return (
    <header className={`topbar ${styles.header}`}>
      <div className="breadcrumb">
        Nhà hàng <span>/</span> <strong>{title}</strong>
      </div>
      <div className="user-area">
        <span className="avatar">{user.displayName?.[0] ?? "K"}</span>
        <div>
          <strong>{user.displayName}</strong>
          <small>{user.roles.map((r) => roleNames[r]).join(", ")}</small>
        </div>
        {!guest && (
          <button
            className="icon-btn"
            title="Đổi mật khẩu"
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
            ⚙
          </button>
        )}
        <button className="text-btn" onClick={logout}>
          Thoát
        </button>
      </div>
    </header>
  );
}

