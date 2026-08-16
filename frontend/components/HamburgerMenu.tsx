"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";

const LINKS = [
  { href: "/appointments", label: "นัดหมายของฉัน" },
  { href: "/patient/profile", label: "ข้อมูลส่วนตัว & ประวัติสุขภาพ" },
  { href: "/booking", label: "จองคิว" },
  { href: "/booking/history", label: "ประวัติการจอง" },
  { href: "/family", label: "บัญชีรองในครอบครัว" },
  { href: "/lab-results", label: "ผลตรวจ" },
];

type MeData = {
  user: { email: string; username: string; phone: string | null; role: string };
  patient: {
    prefix_th: string | null;
    first_name_th: string | null;
    last_name_th: string | null;
    national_id: string | null;
    profile_image: string | null;
  } | null;
};

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [me, setMe] = useState<MeData | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Lock body and prevent any interaction with content behind
  // Must be aggressive to handle iOS Safari + Android Chrome
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${scrollY}px`;
      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.touchAction = "none";
      // Store scrollY for restoration on close
      (window as any).__hamburgerScrollY = scrollY;
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.touchAction = "";
      const prevScroll = (window as any).__hamburgerScrollY || 0;
      window.scrollTo(0, prevScroll);
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.touchAction = "";
    };
  }, [open]);

  // Fetch account info when menu opens
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await api.get<MeData>("/api/auth/me");
        setMe(res);
      } catch {
        // non-fatal
      }
    })();
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

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("กรุณาเลือกไฟล์รูปภาพ");
      return;
    }
    if (file.size > 1_500_000) {
      alert("รูปใหญ่เกินไป (สูงสุด ~1.5MB)");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await api.put("/api/patient/profile-image", { profileImage: dataUrl });
      // refresh me data
      const res = await api.get<MeData>("/api/auth/me");
      setMe(res);
    } catch {
      alert("อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <>
      <button
        aria-label="เปิดเมนู"
        aria-expanded={open}
        onClick={handleOpen}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface"
      >
        <span className="sr-only">เมนู</span>
        <div className="space-y-1.5">
          <span className="block h-0.5 w-5 rounded-full bg-ink transition-all duration-200" />
          <span className="block h-0.5 w-5 rounded-full bg-ink transition-all duration-200" />
          <span className="block h-0.5 w-5 rounded-full bg-ink transition-all duration-200" />
        </div>
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <>
          {/* Backdrop — ทับทุกอย่าง */}
          <button
            aria-label="ปิดเมนู"
            className={`fixed inset-0 z-[9999] transition-opacity duration-300 ${
              animating ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
            onClick={handleClose}
          />

          {/* Sidebar */}
          <nav
            className={`fixed left-0 top-0 z-[99999] h-full w-80 max-w-[90vw] p-6 shadow-2xl transition-transform duration-300 ease-out ${
              animating ? "translate-x-0" : "-translate-x-full"
            }`}
            style={{ backgroundColor: "#E4F2F1" }}
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

            {/* Account mini card */}
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-teal/20 bg-white/70 p-4">
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={uploading}
                aria-label="เปลี่ยนรูปโปรไฟล์"
                className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-teal/30 bg-teal-light"
              >
                {me?.patient?.profile_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.patient.profile_image} alt="profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-display text-lg font-semibold text-teal-dark">
                    {(me?.patient?.first_name_th || me?.user.username || "U").charAt(0)}
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-black/40 py-0.5 text-center text-[9px] text-white">
                  {uploading ? "..." : "แก้"}
                </span>
              </button>
              <div className="min-w-0 flex-1">
                {me ? (
                  <>
                    <p className="truncate font-display text-[15px] font-semibold text-ink">
                      {`${me.patient?.prefix_th || ""}${me.patient?.first_name_th || ""} ${me.patient?.last_name_th || ""}`.trim() || me.user.username}
                    </p>
                    <p className="truncate text-xs text-ink/55">
                      {me.patient?.national_id ? `เลขบัตร ${me.patient.national_id}` : "ยังไม่ระบุเลขบัตร"}
                    </p>
                  </>
                ) : (
                  <div className="h-10 animate-pulse rounded-lg bg-teal/10" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
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
        </>,
        document.body
      )}
    </>
  );
}
