export default function NotFound() {
  return (
    <div className="loading">
      <div className="brand-mark">B</div>
      <h2>Không tìm thấy trang (404)</h2>
      <p className="muted">
        Đường dẫn bạn truy cập không tồn tại hoặc đã thay đổi.
      </p>
      <a className="primary qr-link-button" href="/">
        Quay về trang chủ
      </a>
    </div>
  );
}

