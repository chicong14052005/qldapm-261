"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body>
        <div className="loading">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/logo.ico"
            alt="Bếp Nhà"
            width={56}
            height={56}
            className="brand-logo-img"
          />
          <h2>Hệ thống gặp lỗi nghiêm trọng</h2>
          <p className="muted">
            {error.message || "Không thể khởi chạy giao diện."}
          </p>
          <button type="button" className="primary" onClick={reset}>
            Tải lại ứng dụng
          </button>
        </div>
      </body>
    </html>
  );
}
