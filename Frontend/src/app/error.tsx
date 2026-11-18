"use client";
import BrandLogo from "@/components/common/BrandLogo";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="loading">
      <BrandLogo size={56} />
      <h2>Đã xảy ra sự cố không mong muốn</h2>
      <p className="muted">{error.message || "Vui lòng thử tải lại trang."}</p>
      <button type="button" className="primary" onClick={reset}>
        Thử lại
      </button>
    </div>
  );
}
