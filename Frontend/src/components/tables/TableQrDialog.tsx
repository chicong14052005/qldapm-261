"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { copyTableUrl } from "@/lib/copy-table-url";
import type { TableQr } from "@/types/table";
import styles from "./TableQrDialog.module.css";

export type { TableQr };

export default function TableQrDialog({
  qr,
  onClose,
  onRotate,
}: {
  qr: TableQr;
  onClose: () => void;
  onRotate?: () => void;
}) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setImage("");
    setError("");
    setCopyMessage("");
    QRCode.toDataURL(qr.qrUrl, {
      errorCorrectionLevel: "M",
      width: 320,
      margin: 4,
    })
      .then((value) => {
        if (active) setImage(value);
      })
      .catch(() => {
        if (active) {
          setError(
            "Không thể tạo ảnh QR. Bạn vẫn có thể sao chép link bên dưới.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [qr.qrUrl]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);

  const copy = async () => {
    const result = await copyTableUrl(qr.qrUrl, navigator.clipboard, () => {
      input.current?.focus();
      input.current?.select();
    });
    setCopyMessage(
      result === "copied"
        ? "Đã sao chép đúng URL của bàn."
        : "Đã chọn toàn bộ URL. Nhấn Ctrl+C hoặc chọn Sao chép.",
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className={`modal qr-modal ${styles.qrModal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="table-qr-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="section-bar">
          <div>
            <span className="eyebrow">QR CỐ ĐỊNH TẠI BÀN</span>
            <h2 id="table-qr-title">Bàn {qr.code}</h2>
          </div>
          <button className="icon-btn" aria-label="Đóng QR" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="muted">
          Quét QR hoặc mở liên kết để vào lượt đang mở. Không cần nhập mã tham
          gia.
        </p>
        <div className={`qr-image-area ${styles.imageArea}`}>
          {image ? (
            <img
              src={image}
              width={320}
              height={320}
              alt={`Mã QR cố định bàn ${qr.code}`}
            />
          ) : (
            <p role="status">{error || "Đang tạo ảnh QR…"}</p>
          )}
        </div>
        <label>
          URL đầy đủ của bàn
          <input
            ref={input}
            value={qr.qrUrl}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
            spellCheck={false}
          />
        </label>
        <div className={`qr-actions ${styles.actions}`}>
          <button className="primary" onClick={copy}>
            Sao chép URL
          </button>
          <a
            className="qr-link-button secondary"
            href={qr.qrUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Mở link gốc ↗
          </a>
          {image && (
            <a
              className="qr-link-button secondary"
              href={image}
              download={`QR-ban-${qr.code}.png`}
            >
              Tải ảnh QR
            </a>
          )}
        </div>
        {copyMessage && (
          <p className="qr-copy-message" role="status">
            {copyMessage}
          </p>
        )}
        <p className="qr-footnote">
          QR này dùng lại cho các lượt sau. Nhân viên cần mở lượt trước; QR
          không tự mở bàn. Bản localhost dùng trên chính máy đang chạy ứng dụng.
        </p>
        {onRotate && (
          <button className="text-btn danger" onClick={onRotate}>
            Thay mã QR khi cần vô hiệu link đã in
          </button>
        )}
      </section>
    </div>
  );
}

