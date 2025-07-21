// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers"; // Impor provider kita

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DanaWise AI",
  description: "Manajemen keuangan cerdas dengan AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Bungkus children dengan Providers */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}