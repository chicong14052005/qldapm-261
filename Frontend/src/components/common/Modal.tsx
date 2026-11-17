"use client";
import type { ReactNode } from "react";
import styles from "./Modal.module.css";

export default function Modal({
  title,
  eyebrow,
  onClose,
  className = "",
  ariaLabelledBy,
  children,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  className?: string;
  ariaLabelledBy?: string;
  children: ReactNode;
}) {
  return (
    <div className={`modal-backdrop ${styles.backdrop}`} onClick={onClose}>
      <section
        className={`modal ${styles.dialog} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="section-bar">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2 id={ariaLabelledBy}>{title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

