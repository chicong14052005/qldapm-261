import type { Metadata } from "next";
import { Agbalumo, Inter } from "next/font/google";
import "./globals.css";
import AppProviders from "@/components/providers/AppProviders";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

const agbalumo = Agbalumo({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-agbalumo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bếp Nhà · Quản lý nhà hàng",
  description: "Quản lý gọi món, bếp, phục vụ và thanh toán tại nhà hàng Bếp Nhà.",
  icons: {
    icon: "/logo/logo.ico",
    shortcut: "/logo/logo.ico",
    apple: "/logo/logo.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${inter.variable} ${agbalumo.variable}`}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
