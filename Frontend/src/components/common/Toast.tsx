import { AlertCircle, CheckCircle2, X } from "lucide-react";

export default function Toast({
  error,
  notice,
  onClearError,
  onClearNotice,
}: {
  error?: string;
  notice?: string;
  onClearError?: () => void;
  onClearNotice?: () => void;
}) {
  return (
    <>
      {error && (
        <div className="alert error" role="alert">
          <span className="alert-body">
            <AlertCircle size={18} strokeWidth={2} aria-hidden="true" />
            <span>{error}</span>
          </span>
          {onClearError && (
            <button
              type="button"
              onClick={onClearError}
              aria-label="Đóng thông báo lỗi"
            >
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      {notice && (
        <div className="alert success" role="status">
          <span className="alert-body">
            <CheckCircle2 size={18} strokeWidth={2} aria-hidden="true" />
            <span>{notice}</span>
          </span>
          {onClearNotice && (
            <button
              type="button"
              onClick={onClearNotice}
              aria-label="Đóng thông báo"
            >
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
