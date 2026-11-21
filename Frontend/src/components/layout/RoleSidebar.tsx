"use client";
import { CornerUpLeft, X } from "lucide-react";
import { api } from "@/lib/api";
import { navs } from "@/config/navigation";
import { useAuth } from "@/hooks/useAuth";
import BrandLogo from "@/components/common/BrandLogo";
import NavIcon from "@/components/common/NavIcon";
import styles from "./RoleSidebar.module.css";

export default function RoleSidebar({
  mobileOpen = false,
  onCloseMobile,
}: {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const {
    user,
    setUser,
    guest,
    tab,
    setTab,
    setData,
    ask,
    mutate,
    notify,
    logout,
  } = useAuth();
  if (!user) return null;

  const allowed = navs.filter((n) =>
    n.roles.some((r) => user.roles.includes(r)),
  );

  const openAccountSettings = () => {
    onCloseMobile?.();
    ask(
      "Cài đặt tài khoản",
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
    );
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        className={`sidebar ${styles.sidebar} ${
          mobileOpen ? "mobile-open" : ""
        }`.trim()}
      >
        <div className="sidebar-top">
          <a className="brand" href="/">
            <BrandLogo size={44} showText />
          </a>
          <button
            type="button"
            className="icon-btn sidebar-close-btn"
            title="Đóng menu điều hướng"
            aria-label="Đóng menu điều hướng"
            onClick={onCloseMobile}
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <div className="venue">
          <strong>Bếp nhà - Ấm cúng yêu thương</strong>
          <small>Không gian phục vụ</small>
        </div>
        <span className="nav-caption">ĐIỀU HÀNH NHÀ HÀNG</span>
        <nav aria-label="Điều hướng chính">
          {allowed.map((n) => (
            <button
              key={n.id}
              type="button"
              title={n.label}
              className={tab === n.id ? "active" : ""}
              onClick={() => {
                setTab(n.id);
                setData([]);
                onCloseMobile?.();
              }}
            >
              <span className="nav-icon">
                <NavIcon name={n.icon} />
              </span>
              <span className="nav-label">{n.label}</span>
            </button>
          ))}
          {!guest && (
            <button
              type="button"
              title="Cài đặt tài khoản"
              onClick={openAccountSettings}
            >
              <span className="nav-icon">
                <NavIcon name="settings" />
              </span>
              <span className="nav-label">Cài đặt tài khoản</span>
            </button>
          )}
        </nav>
        {guest && (
          <div className="guest-note">
            Bạn đang gọi món cho lượt khách hiện tại. Các đợt gọi thêm sẽ được
            <strong> quản lý nhà hàng</strong> phê duyệt.
          </div>
        )}
        <button
          type="button"
          className="logout-btn"
          title={guest ? "Thoát" : "Đăng xuất"}
          onClick={logout}
        >
          <CornerUpLeft size={18} strokeWidth={2.4} aria-hidden="true" />
          <span className="logout-label">{guest ? "Thoát" : "Đăng xuất"}</span>
        </button>
      </aside>
    </>
  );
}
