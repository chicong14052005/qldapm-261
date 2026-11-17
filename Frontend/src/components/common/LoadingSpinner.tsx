export default function LoadingSpinner({
  message = "Đang chuẩn bị gian bếp…",
}: {
  message?: string;
}) {
  return (
    <div className="loading">
      <div className="brand-mark">B</div>
      <p>{message}</p>
    </div>
  );
}

