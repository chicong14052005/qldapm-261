"use client";
import { useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { navs } from "@/config/navigation";
import { useAuth } from "@/hooks/useAuth";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import Toast from "@/components/common/Toast";
import TableGrid from "@/components/tables/TableGrid";
import TableQrDialog from "@/components/tables/TableQrDialog";
import MenuCatalog from "@/components/menu/MenuCatalog";
import OrderDetailPanel from "@/components/orders/OrderDetailPanel";
import KitchenBoard from "@/components/kitchen/KitchenBoard";
import ServingQueue from "@/components/serving/ServingQueue";
import ApprovalQueue from "@/components/approvals/ApprovalQueue";
import BillingPanel from "@/components/billing/BillingPanel";
import PaymentHistory from "@/components/billing/PaymentHistory";
import ReceiptModal from "@/components/billing/ReceiptModal";
import StaffTable from "@/components/staff/StaffTable";
import LoginForm from "@/app/(public)/login/LoginForm";
import AppHeader from "./AppHeader";
import RoleSidebar from "./RoleSidebar";
import styles from "./WorkspaceShell.module.css";

export default function WorkspaceShell({
  initialTab,
}: {
  initialTab?: string;
}) {
  const {
    user,
    loaded,
    guest,
    tab,
    setTab,
    menu,
    busy,
    error,
    setError,
    notice,
    setNotice,
    connected,
    form,
    setForm,
    receipt,
    setReceipt,
    tableQr,
    setTableQr,
    paymentHistoryRefresh,
    setPaymentHistoryRefresh,
    pending,
    has,
    notify,
    refresh,
    mutate,
    run,
    ask,
    startNewTakeaway,
    retryPending,
  } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!user || !initialTab) return;
    const allowed = navs.filter((n) =>
      n.roles.some((r) => user.roles.includes(r)),
    );
    if (allowed.some((n) => n.id === initialTab)) {
      setTab(initialTab);
    }
  }, [user, initialTab, setTab]);

  if (!loaded) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <LoginForm />;
  }

  const title = navs.find((n) => n.id === tab)?.label ?? "Thực đơn";
  const isBilling = tab === "billing";

  return (
    <div className={`app ${styles.shell} ${guest ? "customer" : ""}`.trim()}>
      <RoleSidebar
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />
      <div className={`workspace ${styles.workspace}`}>
        <AppHeader
          title={title}
          onToggleMobileNav={() => setMobileNavOpen((v) => !v)}
        />
        <main className="main">
          <div className="page-heading">
            <div>
              {!isBilling && (
                <span className="eyebrow">
                  {guest ? "CHÚC BẠN NGON MIỆNG" : "VẬN HÀNH MỖI NGÀY"}
                </span>
              )}
              <h1>
                {title}
                {!isBilling && <span className="heading-dot">.</span>}
              </h1>
              <p className="muted">
                {isBilling
                  ? "Xác nhận thanh toán và hoàn tất lượt khách."
                  : tab === "tables"
                  ? "Mỗi bàn ăn, một trải nghiệm được chăm chút."
                  : tab === "menu"
                    ? "Món ngon từ nguyên liệu tươi, dành cho mọi khẩu vị."
                    : "Theo dõi công việc và cập nhật trạng thái ngay tại đây."}
              </p>
            </div>
            {!isBilling && (
              <div className="heading-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    tab === "payment-history"
                      ? setPaymentHistoryRefresh((v) => v + 1)
                      : run(refresh)
                  }
                >
                  <RefreshCw size={18} strokeWidth={2} aria-hidden="true" />
                  Làm mới
                </button>
                {!guest &&
                  has("WAITER", "CASHIER", "MANAGER", "ADMIN") && (
                    <button
                      type="button"
                      className="primary"
                      onClick={startNewTakeaway}
                    >
                      <Plus size={18} strokeWidth={2} aria-hidden="true" />
                      Đơn mang về
                    </button>
                  )}
              </div>
            )}
          </div>

          {!connected && (
            <div className="alert error">
              Kết nối bị gián đoạn. Dữ liệu có thể đã cũ; hãy làm mới trước khi
              thao tác.
            </div>
          )}

          <Toast
            error={error}
            notice={notice}
            onClearError={() => setError("")}
            onClearNotice={() => setNotice("")}
          />

          {pending && (
            <div className="alert error">
              <div>
                Kết quả yêu cầu trước chưa xác định. Không tạo yêu cầu mới để
                tránh trùng.
              </div>
              <button disabled={busy} onClick={retryPending}>
                Gửi lại cùng mã yêu cầu
              </button>
            </div>
          )}

          {user.mustChangePassword && (
            <div className="alert error">
              Tài khoản cần đổi mật khẩu lần đầu. Nhấn biểu tượng Cài đặt ở góc
              trên để cập nhật.
            </div>
          )}

          {tab === "payment-history" && has("ADMIN") && (
            <PaymentHistory refreshToken={paymentHistoryRefresh} />
          )}
          {tab === "tables" && <TableGrid />}
          {tab === "menu" && <MenuCatalog />}
          {tab === "orders" && <OrderDetailPanel mode="orders" />}
          {tab === "billing" && <BillingPanel />}
          {tab === "kitchen" && <KitchenBoard />}
          {tab === "serving" && <ServingQueue />}
          {tab === "approvals" && <ApprovalQueue />}
          {tab === "staff" && <StaffTable />}
        </main>
        <footer className="footer">
          Bếp Nhà · Mỗi món ăn là một sự tận tâm.
          <span>CO3011 · Nhóm 5</span>
        </footer>
      </div>

      {tableQr && (
        <TableQrDialog
          qr={tableQr}
          onClose={() => setTableQr(null)}
          onRotate={
            has("MANAGER", "ADMIN")
              ? () => {
                  const previous = tableQr;
                  setTableQr(null);
                  ask(
                    "Thay mã QR cố định",
                    [],
                    async () => {
                      const next = await mutate(
                        `/tables/${previous.id}/qr/rotate`,
                        { expectedVersion: previous.version },
                      );
                      setTableQr(next);
                      notify(
                        "Đã thay mã QR. Ảnh và link cũ sẽ không tham gia lượt được nữa.",
                      );
                    },
                    "Chỉ thay khi cần vô hiệu QR cũ. Bạn cần in hoặc chia sẻ lại QR mới cho bàn này.",
                  );
                }
              : undefined
          }
        />
      )}

      {form && (
        <ConfirmDialog
          form={form}
          categories={menu.categories}
          busy={busy}
          pending={Boolean(pending)}
          error={error}
          onClose={() => setForm(null)}
          onSubmit={(values) => {
            run(async () => {
              await form.submit(values);
              setForm(null);
            });
          }}
        />
      )}

      {receipt && (
        <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
      )}
    </div>
  );
}

