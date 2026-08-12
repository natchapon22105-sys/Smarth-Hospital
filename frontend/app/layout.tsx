import type { Metadata } from "next";
import { Sarabun, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sarabun",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "NudMedi",
  description: "จองคิว บันทึกประวัติ และจัดการข้อมูลสุขภาพของคุณ",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${sarabun.variable} ${inter.variable} ${mono.variable} font-body bg-bg text-ink antialiased`}>
        {children}
        <Footer />
      </body>
    </html>
  );
}
