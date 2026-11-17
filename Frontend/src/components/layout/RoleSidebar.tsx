"use client";
import { navs } from "@/config/navigation";
import { useAuth } from "@/hooks/useAuth";
import styles from "./RoleSidebar.module.css";

export default function RoleSidebar() {
  const { user, guest, tab, setTab, setData, connected } = useAuth();
  if (!user) return null;

  const allowed = navs.filter((n) =>
    n.roles.some((r) => user.roles.includes(r)),
  );

  return (
    <aside className={`sidebar ${styles.sidebar}`}>
      <a className="brand" href="/">
        <span className="brand-mark">B</span>Bếp Nhà
        {/* <span className="brand-dot">●</span> */}
      </a>
      <div className="venue">
        <span className="venue-icon">⌂</span>
        <div>
          <strong>Nhà hàng Bếp Nhà</strong>
          <small>Không gian phục vụ</small>
        </div>
      </div>
      <span className="nav-caption">ĐIỀU HÀNH NHÀ HÀNG</span>
      <nav>
        {allowed.map((n) => (
          <button
            key={n.id}
            className={tab === n.id ? "active" : ""}
            onClick={() => {
              setTab(n.id);
              setData([]);
            }}
          >
            <span>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>
      {guest && (
        <div className="guest-note">
          Bạn đang gọi món cho lượt khách hiện tại. Các đợt gọi thêm sẽ được
          nhân viên phê duyệt.
        </div>
      )}
      <div className="sidebar-bottom">
        <span className={`connection-dot ${connected ? "" : "offline"}`} />
        {connected ? "Đang kết nối hệ thống" : "Mất kết nối"}
        <small>Restaurant Ordering · v1.0</small>
      </div>
    </aside>
  );
}

