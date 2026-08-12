"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

const SYSTEMS = [
  {
    id: "dashboard",
    title: "แดชบอร์ด",
    desc: "ภาพรวมสถิติ การจอง และสัดส่วนตามแผนก",
    icon: <path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z" />,
    href: "/admin/dashboard",
  },
  {
    id: "settings",
    title: "ตั้งค่าระบบ",
    desc: "จัดการคิว AI Model และเวลาให้บริการ",
    icon: <path d="M19.14 12.94a7.49 7.49 0 0 0 .05-.94 7.49 7.49 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.3 7.3 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.74 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.03.31-.05.62-.05.94 0 .32.02.63.05.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.69.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54c.05.24.25.42.5.42h3.84c.25 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.26.12.55.02.69-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />,
    href: "/admin/settings",
  },
  {
    id: "usage",
    title: "สถิติการใช้งาน",
    desc: "จำนวนผู้ใช้ การจอง และรายเดือน",
    icon: <path d="M5 9.2h3V19H5V9.2ZM10.6 5h3v14h-3V5Zm5.6 8H19v6h-2.8v-6Z" />,
    href: "/admin/usage",
  },
  {
    id: "nurses",
    title: "จัดการพยาบาล",
    desc: "อนุมัติ ค้นหา และดูสถานะพยาบาล",
    icon: <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4 0-8 2-8 5v3h16v-3c0-3-4-5-8-5Z" />,
    href: "/admin/nurses",
  },
  {
    id: "send-lab",
    title: "ส่งผลตรวจ",
    desc: "ค้นหาคนไข้ และส่งผลตรวจทางอีเมล",
    icon: <path d="M9 3h6v4a3 3 0 003 3v8a3 3 0 01-3 3H9a3 3 0 01-3-3v-8a3 3 0 003-3V3z" />,
    href: "/admin/send-lab",
  },
];

export default function AdminHomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlineNurses, setOnlineNurses] = useState(0);
  const [totalNurses, setTotalNurses] = useState(0);

  useEffect(() => {
    api
      .get("/api/admin/dashboard")
      .then(() => setChecking(false))
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.push("/admin/login?next=/admin");
        } else {
          setError(err instanceof ApiError ? err.message : "โหลดไม่สำเร็จ");
          setChecking(false);
        }
      });
  }, [router]);

  useEffect(() => {
    if (checking) return;
    api
      .get<{ nurses: any[] }>("/api/admin/nurses/all")
      .then((res) => {
        setTotalNurses(res.nurses.length);
        setOnlineNurses(res.nurses.filter((n: any) => n.isOnline).length);
      })
      .catch(() => {});
  }, [checking]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none fixed inset-0 -z-10 animate-bg-pan bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/usebackground.png")' }}
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-navy-deeper via-navy-dark to-navy" />
      <div className="pointer-events-none fixed inset-0 -z-10 animate-pulse-glow bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.25),transparent_55%)]" />

      <header className="flex animate-fade-in-up items-center gap-3 border-b border-white/10 bg-navy/40 px-5 py-4 backdrop-blur-md">
        <span className="font-display text-lg font-semibold text-white/90 drop-shadow">ระบบจัดการแอดมิน</span>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10 animate-fade-in-up">
        {error && (
          <p className="mb-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        {checking ? (
          <p className="text-sm text-white/50">กำลังตรวจสอบสิทธิ์...</p>
        ) : (
          <>
            <h1 className="mb-2 font-display text-2xl font-semibold text-white drop-shadow">
              เลือกระบบที่ต้องการจัดการ
            </h1>
            <p className="mb-4 text-sm text-white/60">เลือกเข้าสู่แต่ละระบบด้านล่างนี้</p>

            {/* Nurse online status banner */}
            <div className="mb-6 flex items-center gap-3 rounded-xl2 border border-white/10 bg-navy/40 px-4 py-3 shadow-navy-card backdrop-blur-md">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
              </span>
              <p className="text-sm text-white/80">
                พยาบาลที่กำลังทำงานอยู่:{" "}
                <span className="font-semibold text-green-400">{onlineNurses}</span> คน
                <span className="text-white/40"> (จากทั้งหมด {totalNurses} คน)</span>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {SYSTEMS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(s.href)}
                  className="group flex items-start gap-4 rounded-xl2 border border-white/10 bg-navy/40 p-5 text-left shadow-navy-card backdrop-blur-md transition hover:border-navy-accent/50 hover:bg-navy/60"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-accent/15 text-navy-accent shadow-navy-glow">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      {s.icon}
                    </svg>
                  </div>
                  <div>
                    <p className="font-display text-base font-semibold text-white/90 group-hover:text-white">{s.title}</p>
                    <p className="mt-1 text-sm text-white/55">{s.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={async () => {
                  await api.post("/api/auth/logout").catch(() => {});
                  router.push("/admin/login");
                  router.refresh();
                }}
                className="text-sm text-white/40 transition hover:text-red-300"
              >
                ออกจากระบบ
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
