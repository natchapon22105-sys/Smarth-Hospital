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
    title: "จัดการคนไข้",
    desc: "ค้นหาคนไข้ ส่งผลตรวจ และนัดหมาย",
    icon: <path d="M9 3h6v4a3 3 0 003 3v8a3 3 0 01-3 3H9a3 3 0 01-3-3v-8a3 3 0 003-3V3z" />,
    href: "/admin/send-lab",
  },
  {
    id: "users",
    title: "จัดการบัญชีผู้ใช้",
    desc: "ดู แก้ไข และลบบัญชีผู้ใช้ทั้งหมด",
    icon: <><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6" /><path d="M23 11h-6" /></>,
    href: "/admin/users",
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
    <main className="relative min-h-screen overflow-hidden bg-white">
      {/* Floating circles with + */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-10 -top-10 h-40 w-40 animate-float-1 rounded-full border-2 border-teal/20" />
        <div className="absolute left-1/4 top-1/3 h-24 w-24 animate-float-2 rounded-full border-2 border-teal/15" />
        <div className="absolute right-[15%] top-[10%] h-32 w-32 animate-float-3 rounded-full border-2 border-teal/10" />
        <div className="absolute bottom-[20%] right-[10%] h-20 w-20 animate-float-4 rounded-full border-2 border-teal/15" />
        {/* Plus signs */}
        <span className="absolute left-[8%] top-[15%] animate-float-1 text-2xl font-light text-teal/10">+</span>
        <span className="absolute right-[20%] top-[30%] animate-float-2 text-3xl font-light text-teal/10">+</span>
        <span className="absolute left-[30%] bottom-[25%] animate-float-3 text-xl font-light text-teal/10">+</span>
        <span className="absolute right-[5%] bottom-[10%] animate-float-4 text-2xl font-light text-teal/10">+</span>
        <span className="absolute left-[60%] top-[5%] animate-float-2 text-lg font-light text-teal/10">+</span>
      </div>

      <header className="flex animate-fade-in-up items-center gap-3 border-b border-line bg-white px-5 py-4">
        <span className="font-display text-lg font-semibold text-ink">ระบบจัดการแอดมิน</span>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10 animate-fade-in-up">
        {error && (
          <p className="mb-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-500">{error}</p>
        )}

        {checking ? (
          <p className="text-sm text-ink/50">กำลังตรวจสอบสิทธิ์...</p>
        ) : (
          <>
            <h1 className="mb-2 font-display text-2xl font-semibold text-ink">
              เลือกระบบที่ต้องการจัดการ
            </h1>
            <p className="mb-4 text-sm text-ink/60">เลือกเข้าสู่แต่ละระบบด้านล่างนี้</p>

            {/* Nurse online status banner */}
            <div className="mb-6 flex items-center gap-3 rounded-xl2 border border-line bg-teal-light/50 px-4 py-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
              </span>
              <p className="text-sm text-ink/80">
                เวชระเบียนที่กำลังทำงานอยู่:{" "}
                <span className="font-semibold text-green-600">{onlineNurses}</span> คน
                <span className="text-ink/40"> (จากทั้งหมด {totalNurses} คน)</span>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {SYSTEMS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(s.href)}
                  className="group flex items-start gap-4 rounded-xl2 border border-line bg-white p-5 text-left shadow-sm transition hover:border-teal/30 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-light text-teal">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      {s.icon}
                    </svg>
                  </div>
                  <div>
                    <p className="font-display text-base font-semibold text-ink group-hover:text-teal-dark">{s.title}</p>
                    <p className="mt-1 text-sm text-ink/55">{s.desc}</p>
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
                className="text-sm text-ink/40 transition hover:text-red-500"
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
