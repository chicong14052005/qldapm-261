"use client";
import { useState } from "react";
import { X } from "lucide-react";
import type { FormConfig } from "@/types/api";
import type { Category } from "@/types/menu";
import { roleNames } from "@/config/roles";
import { paymentMethodNames } from "@/config/status";

export default function ConfirmDialog({
  form,
  categories,
  busy,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  form: FormConfig;
  categories: Category[];
  busy: boolean;
  pending: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const [localError, setLocalError] = useState("");

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <section className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="section-bar">
          <h2>{form.title}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        {form.description && <p className="muted">{form.description}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const values = Object.fromEntries(formData) as Record<
              string,
              string
            >;
            for (const f of form.fields) {
              if (f.type !== "checkboxes") continue;
              const picked = formData.getAll(f.name).map(String);
              if (picked.length === 0 && f.required !== false) {
                setLocalError(`Chọn ít nhất một mục cho "${f.label}".`);
                return;
              }
              values[f.name] = picked.join(",");
            }
            setLocalError("");
            onSubmit(values);
          }}
        >
          {form.fields.map((f) =>
            f.type === "checkboxes" ? (
              <fieldset key={f.name} className="checkbox-group">
                <legend>{f.label}</legend>
                <div className="checkbox-grid">
                  {f.options?.map((o) => (
                    <label key={o} className="checkbox-option">
                      <input
                        type="checkbox"
                        name={f.name}
                        value={o}
                        defaultChecked={String(f.value ?? "")
                          .split(",")
                          .includes(o)}
                        onChange={() => setLocalError("")}
                      />
                      <span>{roleNames[o] ?? o}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
            <label key={f.name}>
              {f.label}
              {f.type === "select" ? (
                <select name={f.name} defaultValue={f.value ?? f.options?.[0]}>
                  {f.options?.map((o) => (
                    <option key={o} value={o}>
                      {categories.find((c) => c.id === o)?.name ??
                        roleNames[o] ??
                        paymentMethodNames[o] ??
                        o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name={f.name}
                  type={f.type ?? "text"}
                  defaultValue={f.value ?? ""}
                  required={f.required !== false}
                  min={f.type === "number" ? 0 : undefined}
                />
              )}
            </label>
            ),
          )}
          {localError && <div className="alert error">{localError}</div>}
          {error && <div className="alert error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Quay lại
            </button>
            <button className="primary" disabled={busy || pending}>
              {busy ? "Đang xử lý…" : "Xác nhận"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

