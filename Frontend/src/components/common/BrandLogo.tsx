/* eslint-disable @next/next/no-img-element */
export default function BrandLogo({
  size = 40,
  showText = false,
  className = "",
}: {
  size?: number;
  showText?: boolean;
  className?: string;
}) {
  return (
    <span className={`brand-logo ${className}`.trim()}>
      <img
        src="/logo/logo.ico"
        alt="Bếp Nhà"
        width={size}
        height={size}
        className="brand-logo-img"
      />
      {showText && <span className="brand-logo-text">Bếp Nhà</span>}
    </span>
  );
}

