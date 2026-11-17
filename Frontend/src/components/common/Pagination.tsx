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
          className="secondary"
          disabled={loading || page <= 1}
          onClick={onPrev}
        >
          ← Trước
        </button>
        <button
          className="secondary"
          disabled={loading || page >= totalPages}
          onClick={onNext}
        >
          Sau →
        </button>
      </div>
    </div>
  );
}

