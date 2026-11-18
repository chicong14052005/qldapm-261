import BrandLogo from "@/components/common/BrandLogo";

export default function LoadingSpinner({
  message = "Đang chuẩn bị gian bếp…",
}: {
  message?: string;
}) {
  return (
    <div className="loading">
      <BrandLogo size={56} />
      <p>{message}</p>
    </div>
  );
}
