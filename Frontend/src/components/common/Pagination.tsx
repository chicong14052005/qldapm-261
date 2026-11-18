import { ArrowLeft, ArrowRight } from "lucide-react";

export default function Pagination({
  page,
  totalPages,
  totalCount,
  loading,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="history-pagination">
      <span>
        {totalCount === 0
          ? "0 đơn"
          : `Trang ${page} / ${Math.max(1, totalPages)} · Tổng ${totalCount} đơn`}
      </span>
      <div>
        <button
          type="button"
          className="secondary"
          disabled={loading || page <= 1}
          onClick={onPrev}
        >
          <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
          Trước
        </button>
        <button
          type="button"
          className="secondary"
          disabled={loading || page >= totalPages}
          onClick={onNext}
        >
          Sau
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
