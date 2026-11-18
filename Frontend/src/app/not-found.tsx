import BrandLogo from "@/components/common/BrandLogo";

export default function NotFound() {
  return (
    <div className="loading">
      <BrandLogo size={56} />
      <h2>Không tìm thấy trang (404)</h2>
      <p className="muted">
        Đường dẫn bạn truy cập không tồn tại hoặc đã thay đổi.
      </p>
      <a className="primary" href="/">
        Quay về trang chủ
      </a>
    </div>
  );
}
