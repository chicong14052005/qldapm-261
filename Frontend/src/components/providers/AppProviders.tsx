"use client";
import type { ReactNode } from "react";
import { ToastProvider } from "./ToastProvider";
import { AuthProvider } from "./AuthProvider";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}

