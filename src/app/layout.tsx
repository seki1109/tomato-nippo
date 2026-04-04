import { Geist } from "next/font/google";

import "./globals.css";

import { AuthProvider } from "@/contexts/AuthContext";

import type { Metadata } from "next";


const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "営業日報システム",
  description: "Sales Daily Report Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={geist.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
