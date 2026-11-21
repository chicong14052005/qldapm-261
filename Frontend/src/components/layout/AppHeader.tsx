"use client";
import { Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import BrandLogo from "@/components/common/BrandLogo";
import styles from "./AppHeader.module.css";

/* Thanh trên chỉ hiện trên điện thoại để mở menu; desktop/tablet dùng sidebar (mẫu 20/11/2026). */
export default function AppHeader({
  onToggleMobileNav,
}: {
  onToggleMobileNav?: () => void;
}) {
  const { user } = useAuth();
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
      </div>
    </header>
  );
}
