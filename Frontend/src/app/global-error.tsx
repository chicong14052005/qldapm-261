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
          <div className="brand-mark">B</div>
          <h2>Hệ thống gặp lỗi nghiêm trọng</h2>
          <p className="muted">
            {error.message || "Không thể khởi chạy giao diện."}
          </p>
          <button className="primary" onClick={reset}>
            Tải lại ứng dụng
          </button>
        </div>
      </body>
    </html>
  );
}

