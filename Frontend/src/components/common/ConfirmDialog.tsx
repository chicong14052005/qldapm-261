"use client";
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
  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <section className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="section-bar">
          <h2>{form.title}</h2>
          <button className="icon-btn" onClick={onClose}>
            ×
          </button>
        </div>
        {form.description && <p className="muted">{form.description}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const values = Object.fromEntries(
              new FormData(e.currentTarget),
            ) as Record<string, string>;
            onSubmit(values);
          }}
        >
          {form.fields.map((f) => (
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
          ))}
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

