"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const LINKS = [
  { href: "/patient/profile", label: "ข้อมูลส่วนตัว & ประวัติสุขภาพ" },
  { href: "/booking", label: "จองคิว" },
  { href: "/nurse", label: "ระบบคิว (พยาบาล)" },
  { href: "/admin", label: "ระบบจัดการ" },
];

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const [animating, setAnimating] = useState(false);
  const router = useRouter();

  // Lock body and prevent any interaction with content behind
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function handleOpen() {
    setOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimating(true);
      });
    });
  }

  function handleClose() {
    setAnimating(false);
    setTimeout(() => setOpen(false), 300);
  }

  async function handleLogout() {
    await api.post("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <button
        aria-label="เปิดเมนู"
        aria-expanded={open}
        onClick={handleOpen}
        className="relative z-30 flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface"
      >
        <span className="sr-only">เมนู</span>
        <div className="space-y-1.5">
          <span className="block h-0.5 w-5 rounded-full bg-ink transition-all duration-200" />
          <span className="block h-0.5 w-5 rounded-full bg-ink transition-all duration-200" />
          <span className="block h-0.5 w-5 rounded-full bg-ink transition-all duration-200" />
        </div>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <button
            aria-label="ปิดเมนู"
            className={`fixed inset-0 z-40 transition-opacity duration-300 ${
              animating ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
            onClick={handleClose}
          />

          {/* Sidebar */}
          <nav
            className={`fixed left-0 top-0 z-50 h-full w-72 max-w-[85vw] p-5 shadow-xl transition-transform duration-300 ease-out ${
              animating ? "translate-x-0" : "-translate-x-full"
            }`}
            style={{ backgroundColor: "#E4F2F1" }} /* mint green */
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="font-display text-lg font-semibold text-teal-dark">เมนู</span>
              <button
                aria-label="ปิดเมนู"
                onClick={handleClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-teal-dark hover:bg-teal/20"
              >
                ✕
              </button>
            </div>
            <ul className="space-y-1">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={handleClose}
                    className="block rounded-lg px-3 py-2.5 text-[15px] text-ink hover:bg-white/70"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-teal/20 pt-4">
              <button
                onClick={handleLogout}
                className="w-full rounded-lg px-3 py-2.5 text-left text-[15px] text-danger hover:bg-danger/10"
              >
                ออกจากระบบ
              </button>
            </div>
          </nav>
        </>
      )}
    </>
  );
}
