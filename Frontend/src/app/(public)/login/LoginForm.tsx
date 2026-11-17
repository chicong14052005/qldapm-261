"use client";
import { useAuth } from "@/hooks/useAuth";
import styles from "./login.module.css";

export default function LoginForm() {
  const {
    guest,
    setGuest,
    qrInfo,
    qrToken,
    setQrToken,
    busy,
    error,
    setError,
    login,
    joinByTokenOrUrl,
  } = useAuth();

  return (
    <main className={`entry ${styles.entry}`}>
      <section className={`entry-story ${styles.story}`}>
        <a className="brand" href="/">
          <span className="brand-mark">B</span>Bếp Nhà
          <span className="brand-dot">●</span>
        </a>
        <div>
          <span className="eyebrow">MỘT BỮA ĂN NGON, MỘT TRẢI NGHIỆM TỐT</span>
          <h1>
            Từ gian bếp,
            <br />
            đến bàn ăn.
          </h1>
          <p>
            Gọi món chính xác. Phối hợp nhịp nhàng.
            <br />
            Chăm sóc từng bữa ăn của khách.
          </p>
          <div className="story-plate">
            <img src="/menu/placeholder.svg" alt="Món ăn tại Bếp Nhà" />
          </div>
        </div>
        <small>RESTAURANT ORDERING SYSTEM · NHÓM 5</small>
      </section>
      <section className={`entry-form ${styles.formSection}`}>
        <div className="entry-box">
          <span className="eyebrow">CHÀO MỪNG ĐẾN BẾP NHÀ</span>
          <h2>{guest ? "Tham gia bàn ăn" : "Đăng nhập làm việc"}</h2>
          <p className="muted">
            {guest
              ? `${qrInfo?.tableCode ?? "Bàn ăn"} · Mở liên kết hoặc quét QR cố định để gọi món.`
              : "Chọn đúng tài khoản để bắt đầu ca làm việc."}
          </p>
          {error && <div className="alert error">{error}</div>}
          {guest ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                joinByTokenOrUrl(String(f.get("tableUrl") ?? qrToken));
              }}
            >
              <label>
                Liên kết của bàn
                <input
                  name="tableUrl"
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  required
                  placeholder="Dán URL của bàn tại đây"
                />
              </label>
              <button disabled={busy} className="primary wide">
                Vào thực đơn →
              </button>
            </form>
          ) : (
            <form onSubmit={login}>
              <label>
                Tên đăng nhập
                <input
                  name="username"
                  autoComplete="username"
                  defaultValue="admin"
                  required
                />
              </label>
              <label>
                Mật khẩu
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button disabled={busy} className="primary wide">
                {busy ? "Đang đăng nhập…" : "Đăng nhập →"}
              </button>
            </form>
          )}
          <button
            className="text-btn"
            onClick={() => {
              setGuest(!guest);
              setError("");
            }}
          >
            {guest
              ? "← Đăng nhập nhân viên"
              : "Bạn là thực khách? Tham gia bàn ăn →"}
          </button>
          <div className="entry-help">
            Bản demo cục bộ · Tài khoản và hướng dẫn chạy tại README của dự án.
          </div>
        </div>
      </section>
    </main>
  );
}

