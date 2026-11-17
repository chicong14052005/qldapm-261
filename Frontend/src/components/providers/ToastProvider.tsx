"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { NOTICE_TIMEOUT_MS } from "@/config/polling";

type ToastContextValue = {
  notice: string;
  setNotice: (value: string) => void;
  notify: (text: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState("");

  const notify = useCallback((text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(""), NOTICE_TIMEOUT_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ notice, setNotice, notify }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast phải nằm trong ToastProvider.");
  return ctx;
}

