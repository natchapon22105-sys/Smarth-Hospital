import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "NudMedi Staff",
  description: "ระบบสำหรับพยาบาลและผู้ดูแลระบบ",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${ibmPlexSansThai.variable} ${inter.variable} ${mono.variable} font-body bg-bg text-ink antialiased`}>
        {children}
      </body>
    </html>
  );
}
