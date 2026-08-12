"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HIDDEN_PATHS = ["/login", "/register", "/forgot-password"];

export default function Footer() {
  const pathname = usePathname();
  if (HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;

  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 border-t border-line bg-surface">
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="NudMedi" className="h-6 w-6 rounded-md object-contain" />
            <span className="font-display text-sm font-semibold text-ink">NudMedi</span>
          </div>

          {/* TODO: รอรายละเอียดจากผู้ใช้ (ลิงก์ / ข้อความ / โซเชียล ฯลฯ) */}
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ink/55">
            <Link href="/app-home" className="hover:text-teal-dark">หน้าแรก</Link>
            <Link href="/booking" className="hover:text-teal-dark">จองคิว</Link>
            <Link href="/patient/profile" className="hover:text-teal-dark">ข้อมูลส่วนตัว</Link>
            <Link href="/lab-results" className="hover:text-teal-dark">ผลตรวจ</Link>
          </nav>

          <p className="text-xs text-ink/40">
            © {year} NudMedi. สงวนลิขสิทธิ์.
          </p>
        </div>
      </div>
    </footer>
  );
}
