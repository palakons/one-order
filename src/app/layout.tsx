import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "VEATEC — VISTEC Campus Food Pooling & Delivery",
  description: "VEATEC (VISTEC Eats) ระบบรวมสั่งข้าวเที่ยงชาว VISTEC สถาบันวิทยสิริเมธี ส่งถึงโต๊ะตึกเรียน M4",
};

import { LanguageProvider } from "@/lib/i18n";
import VersionBadge from "@/components/VersionBadge";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
    >
      <body className="min-h-screen flex flex-col">
        <LanguageProvider>
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <VersionBadge />
        </LanguageProvider>
      </body>
    </html>
  );
}
