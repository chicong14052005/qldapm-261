"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="loading">
      <div className="brand-mark">B</div>
      <h2>Đã xảy ra sự cố không mong muốn</h2>
      <p className="muted">{error.message || "Vui lòng thử tải lại trang."}</p>
      <button className="primary" onClick={reset}>
        Thử lại
      </button>
    </div>
  );
}

