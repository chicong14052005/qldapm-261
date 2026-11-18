"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { ArrowLeft, ArrowRight, Eye, EyeOff, QrCode, Upload } from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";
import Modal from "@/components/common/Modal";
import { useAuth } from "@/hooks/useAuth";
import styles from "./login.module.css";

function decodeCanvasQr(
  source: HTMLVideoElement | ImageBitmap,
  width: number,
  height: number,
  canvas: HTMLCanvasElement,
): string | null {
  if (!width || !height) return null;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const result = jsQR(imageData.data, width, height, {
    inversionAttempts: "attemptBoth",
  });
  return result?.data?.trim() || null;
}

function getCameraErrorMessage(err: unknown): string {
  const name = err instanceof Error ? err.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Trình duyệt hoặc hệ điều hành chưa được cấp quyền Camera. Hãy bấm biểu tượng ổ khóa trên thanh địa chỉ để cho phép Camera.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Không tìm thấy camera khả dụng trên thiết bị (hoặc công tắc camera trên laptop đang tắt).";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Camera đang được sử dụng bởi một ứng dụng hoặc tab khác. Hãy tắt ứng dụng đó rồi mở lại hộp thoại này.";
  }
  return "Không thể khởi chạy camera. Bạn vẫn có thể chọn ảnh mã QR hoặc dán liên kết bàn bên dưới.";
}

export default function LoginForm() {
  const {
    guest,
    setGuest,
    qrInfo,
    qrToken,
    setQrToken,
    busy,
    error,
    setError,
    login,
    joinByTokenOrUrl,
  } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrScanError, setQrScanError] = useState("");
  const [qrManualInput, setQrManualInput] = useState("");
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const joinRef = useRef(joinByTokenOrUrl);
  const setQrTokenRef = useRef(setQrToken);

  joinRef.current = joinByTokenOrUrl;
  setQrTokenRef.current = setQrToken;

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!qrModalOpen) {
      stopCamera();
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let lastScanAt = 0;
    const scanCanvas = document.createElement("canvas");

    async function requestStream(): Promise<MediaStream> {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch (firstErr) {
        const name = firstErr instanceof Error ? firstErr.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          throw firstErr;
        }
        return await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
    }

    async function startScanner() {
      setQrScanError("");
      setCameraActive(false);

      if (typeof window !== "undefined" && !window.isSecureContext) {
        setQrScanError(
          "Trình duyệt chặn camera khi mở qua HTTP không bảo mật. Hãy mở bằng localhost/HTTPS hoặc chọn ảnh mã QR / dán liên kết bên dưới.",
        );
        return;
      }

      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setQrScanError(
          "Trình duyệt hiện tại không hỗ trợ truy cập camera. Bạn có thể chọn ảnh mã QR hoặc dán liên kết bên dưới.",
        );
        return;
      }

      try {
        const stream = await requestStream();
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        setCameraActive(true);

        const tick = (now: number) => {
          if (cancelled || !videoRef.current) return;
          const v = videoRef.current;
          if (
            v.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
            v.videoWidth > 0 &&
            now - lastScanAt >= 120
          ) {
            lastScanAt = now;
            const hit = decodeCanvasQr(v, v.videoWidth, v.videoHeight, scanCanvas);
            if (hit) {
              setQrTokenRef.current(hit);
              setQrModalOpen(false);
              joinRef.current(hit);
              return;
            }
          }
          rafId = window.requestAnimationFrame(tick);
        };
        rafId = window.requestAnimationFrame(tick);
      } catch (err) {
        if (!cancelled) {
          setCameraActive(false);
          setQrScanError(getCameraErrorMessage(err));
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      stopCamera();
    };
  }, [qrModalOpen]);

  const handleQrImageUpload = async (file: File | undefined) => {
    if (!file) return;
    setQrScanError("");
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const hit = decodeCanvasQr(bitmap, bitmap.width, bitmap.height, canvas);
      bitmap.close?.();
      if (!hit) {
        setQrScanError("Không tìm thấy mã QR hợp lệ trong ảnh đã chọn.");
        return;
      }
      setQrToken(hit);
      setQrModalOpen(false);
      joinByTokenOrUrl(hit);
    } catch {
      setQrScanError(
        "Không thể giải mã ảnh QR này. Vui lòng thử ảnh rõ nét hơn hoặc dán liên kết trực tiếp.",
      );
    }
  };

  return (
    <main className={styles.entry}>
      <section className={styles.story}>
        <a className={styles.storyBrand} href="/">
          <BrandLogo size={44} />
          <span className={styles.storyBrandText}>Bếp Nhà</span>
        </a>

        <div className={styles.storyContent}>
          <span className={styles.storyTagline}>
            MỘT BỮA ĂN NGON, MỘT TRẢI NGHIỆM TỐT
          </span>
          <h1 className={styles.storyHeading}>Từ gian bếp - đến bàn ăn</h1>
          <div className={styles.storyPills}>
            <p className={styles.storyPill}>Gọi món chính xác.</p>
            <p className={styles.storyPill}>Phối hợp nhịp nhàng.</p>
            <p className={styles.storyPill}>Chăm sóc từng bữa ăn của khách.</p>
          </div>
        </div>

        {/* <small className={styles.storyFootnote}>
          RESTAURANT ORDERING SYSTEM · NHÓM 5
        </small> */}
      </section>

      <section className={styles.formSection}>
        <div className={styles.entryBox}>
          <span className={styles.welcomeEyebrow}>CHÀO MỪNG ĐẾN BẾP NHÀ</span>
          <h2 className={styles.entryHeading}>
            {guest ? "Tham gia bàn ăn" : "Đăng nhập vào hệ thống"}
          </h2>
          <p className={styles.entrySubtext}>
            {guest
              ? qrInfo?.tableCode
                ? `${qrInfo.tableCode} · Hãy nhập liên kết hoặc quét QR tại bàn để được gọi món!`
                : "Hãy nhập liên kết hoặc quét QR tại bàn để được gọi món!"
              : "Hãy đăng nhập với tư cách phù hợp để truy cập trang quản lý của mình!"}
          </p>

          {error && (
            <div className="alert error" role="alert">
              <span>{error}</span>
            </div>
          )}

          {guest ? (
            <form
              key="guest-form"
              className={styles.entryForm}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                joinByTokenOrUrl(String(f.get("tableUrl") ?? qrToken ?? ""));
              }}
            >
              <label className={styles.fieldLabel}>
                Liên kết của bàn
                <input
                  className={styles.entryInput}
                  name="tableUrl"
                  value={qrToken ?? ""}
                  onChange={(e) => setQrToken(e.target.value)}
                  required
                  placeholder="http://localhost:3000/qr/abcdefghijk123456lmnopq"
                />
              </label>

              <button disabled={busy} className={styles.submitBtn}>
                {busy ? "Đang kết nối bàn…" : "Vào trang thực đơn"}
              </button>

              <div className={styles.orLabel}>Hoặc</div>

              <button
                type="button"
                className={styles.submitBtn}
                disabled={busy}
                onClick={() => {
                  setQrManualInput(qrToken ?? "");
                  setQrModalOpen(true);
                }}
              >
                <QrCode size={18} strokeWidth={2} aria-hidden="true" />
                Quét QR tại bàn
              </button>
            </form>
          ) : (
            <form key="staff-form" className={styles.entryForm} onSubmit={login}>
              <label className={styles.fieldLabel}>
                Tên đăng nhập
                <input
                  className={styles.entryInput}
                  name="username"
                  autoComplete="username"
                  defaultValue="admin"
                  required
                />
              </label>

              <label className={styles.fieldLabel}>
                Mật khẩu
                <div className={styles.passwordWrap}>
                  <input
                    className={`${styles.entryInput} ${styles.passwordInput}`}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className={styles.eyeToggle}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <EyeOff size={18} strokeWidth={1.9} aria-hidden="true" />
                    ) : (
                      <Eye size={18} strokeWidth={1.9} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </label>

              <button disabled={busy} className={styles.submitBtn}>
                {busy ? "Đang đăng nhập…" : "Đăng nhập"}
              </button>
            </form>
          )}

          {guest ? (
            <div className={styles.linkRow}>
              <button
                type="button"
                className={styles.textAction}
                onClick={() => {
                  setGuest(false);
                  setError("");
                }}
              >
                <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
                Quay lại
              </button>
            </div>
          ) : (
            <div className={styles.linkRow}>
              <button
                type="button"
                className={styles.textAction}
                onClick={() => setForgotOpen(true)}
              >
                Quên mật khẩu?
              </button>
              <button
                type="button"
                className={styles.textAction}
                onClick={() => {
                  setGuest(true);
                  setError("");
                }}
              >
                Bạn là thực khách? Tham gia bàn ăn
                <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </section>

      {forgotOpen && (
        <Modal
          title="Đặt lại mật khẩu nhân viên"
          eyebrow="HƯỚNG DẪN TÀI KHOẢN"
          ariaLabelledBy="forgot-password-title"
          onClose={() => setForgotOpen(false)}
        >
          <p className="muted">
            Hệ thống vận hành nội bộ không gửi email khôi phục tự động. Khi quên
            mật khẩu, bạn vui lòng liên hệ{" "}
            <strong>Quản trị viên (Admin)</strong> của nhà hàng để được đặt lại
            mật khẩu tạm thời.
          </p>
          <div className="modal-actions">
            <button
              type="button"
              className="primary"
              onClick={() => setForgotOpen(false)}
            >
              Đã hiểu
            </button>
          </div>
        </Modal>
      )}

      {qrModalOpen && (
        <Modal
          title="Quét mã QR tại bàn"
          eyebrow="THỰC KHÁCH GỌI MÓN"
          ariaLabelledBy="guest-qr-scanner-title"
          onClose={() => setQrModalOpen(false)}
        >
          <p className="muted">
            Hướng camera về phía mã QR đặt trên bàn, chọn ảnh QR có sẵn hoặc dán
            liên kết bàn trực tiếp bên dưới.
          </p>

          <div className={styles.qrVideoBox}>
            <video
              ref={videoRef}
              className={`${styles.qrVideo} ${
                cameraActive ? "" : styles.qrVideoHidden
              }`.trim()}
              muted
              playsInline
              autoPlay
            />
            {!cameraActive && (
              <div className={styles.qrScannerHint}>
                {qrScanError || "Đang khởi tạo camera…"}
              </div>
            )}
          </div>

          {cameraActive && qrScanError && (
            <div className="alert error" role="alert">
              <span>{qrScanError}</span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              handleQrImageUpload(e.target.files?.[0]);
              e.currentTarget.value = "";
            }}
          />

          <div className={styles.qrModalActions}>
            <button
              type="button"
              className="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} strokeWidth={2} aria-hidden="true" />
              Chọn ảnh mã QR
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!qrManualInput.trim()) return;
              setQrToken(qrManualInput.trim());
              setQrModalOpen(false);
              joinByTokenOrUrl(qrManualInput.trim());
            }}
          >
            <label>
              Hoặc dán liên kết / mã bàn thủ công
              <input
                value={qrManualInput ?? ""}
                onChange={(e) => setQrManualInput(e.target.value)}
                placeholder="http://localhost:3000/qr/..."
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setQrModalOpen(false)}
              >
                Đóng
              </button>
              <button
                type="submit"
                className="primary"
                disabled={!qrManualInput.trim() || busy}
              >
                Vào bàn ăn
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}
