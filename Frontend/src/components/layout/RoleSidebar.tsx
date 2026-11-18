"use client";
import { Store, X } from "lucide-react";
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
  const { user, guest, tab, setTab, setData, connected } = useAuth();
  if (!user) return null;

  const allowed = navs.filter((n) =>
    n.roles.some((r) => user.roles.includes(r)),
  );

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
            <BrandLogo size={38} showText />
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
          <span className="venue-icon" aria-hidden="true">
            <Store size={20} strokeWidth={1.9} />
          </span>
          <div>
            <strong>Bếp Nhà</strong>
            <small>Ấm cúng - Thân thiện</small>
          </div>
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
                <NavIcon name={n.icon} size={22} />
              </span>
              <span className="nav-label">{n.label}</span>
            </button>
          ))}
        </nav>
        {guest && (
          <div className="guest-note">
            Bạn đang gọi món cho lượt khách hiện tại. Các đợt gọi thêm sẽ được
            <strong> quản lý nhà hàng</strong> phê duyệt.
          </div>
        )}
        <div className="sidebar-bottom">
          <span className={`connection-dot ${connected ? "" : "offline"}`} />
          {connected ? "Đang kết nối hệ thống" : "Mất kết nối"}
          <small>Bếp Nhà · v1.0</small>
        </div>
      </aside>
    </>
  );
}
