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
          {error}
          {onClearError && <button onClick={onClearError}>×</button>}
        </div>
      )}
      {notice && (
        <div className="alert success" role="status">
          {notice}
          {onClearNotice && <button onClick={onClearNotice}>×</button>}
        </div>
      )}
    </>
  );
}

