"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";
import ServiceCard from "@/components/ServiceCard";
import Image from "next/image";
import { api } from "@/lib/api";

export default function AppHomePage() {
  const [newResults, setNewResults] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);

  useEffect(() => {
    function load() {
      api
        .get<{ results: { id: string; is_read: number }[] }>("/api/lab/results")
        .then((res) => {
          const count = res.results.filter((r) => !r.is_read).length;
          setNewResults(count);
        })
        .catch(() => setNewResults(0));
      // โหลดนัดหมายที่กำลังจะมาถึง
      api
        .get<{ appointments: any[] }>("/api/booking/appointments")
        .then((res) => setUpcomingCount(res.appointments.filter((a: any) => !a.is_read).length))
        .catch(() => setUpcomingCount(0));
    }
    load();
    window.addEventListener("lab-results-read", load);
    window.addEventListener("appointments-read", load);
    return () => {
      window.removeEventListener("lab-results-read", load);
      window.removeEventListener("appointments-read", load);
    };
  }, []);

  return (
    <main className="relative min-h-screen">
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat opacity-[0.06]"
        style={{ backgroundImage: 'url("/usebackground.png")' }}
      />

      {/* Animated floating decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ transformStyle: "preserve-3d" }}>
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-teal/10 animate-[float-1_8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-teal/10 animate-[float-2_10s_ease-in-out_infinite]" />
        <div className="absolute left-1/4 top-1/3 h-20 w-20 rounded-full bg-teal/10 animate-[float-3_7s_ease-in-out_infinite]" />
        <div className="absolute left-[15%] top-[15%] text-4xl text-teal/20 animate-[spin-plus_12s_linear_infinite]" style={{ transformStyle: "preserve-3d" }}>+</div>
        <div className="absolute right-[20%] bottom-[20%] text-3xl text-teal/20 animate-[spin-plus_15s_linear_infinite_2s]" style={{ transformStyle: "preserve-3d" }}>+</div>
      </div>

      <header className="relative flex items-center justify-between px-5 py-4">
        <HamburgerMenu />
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-teal/30 shadow-lg">
            <Image src="/logo.png" alt="NudMedi" width={64} height={64} className="h-full w-full object-cover" />
          </div>
          <span className="gradient-text font-display text-2xl font-bold tracking-wider">NUDMEDI</span>
        </div>
        <div className="h-10 w-10" />
      </header>

      <section className="relative z-10 mx-auto flex max-w-md flex-col items-center px-5 pt-10">
        <h1 className="font-display text-xl font-semibold text-ink">เลือกบริการ</h1>
        <p className="mt-1 text-center text-sm text-ink/55">แตะเพื่อเริ่มใช้บริการ ของ NudMedi</p>

        {newResults > 0 && (
          <Link
            href="/lab-results"
            className="mt-5 flex w-full items-center gap-3 rounded-xl border border-teal/30 bg-teal-light px-4 py-3 transition hover:bg-teal/20"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 01-3.4 0" />
              </svg>
            </span>
            <span className="text-sm text-ink">
              มีผลตรวจใหม่ <strong>{newResults}</strong> รายการ รอให้คุณตรวจสอบ
            </span>
            <svg className="ml-auto text-teal-dark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        )}

        <div className="mt-8 grid w-full grid-cols-2 gap-4">
          <ServiceCard
            href="/appointments"
            label="นัดหมาย"
            alert={upcomingCount > 0}
            badge={upcomingCount > 0 ? upcomingCount : null}
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
                <path d="M9 15l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <ServiceCard
            href="/booking"
            label="จองคิว"
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
                <circle cx="12" cy="15" r="2.5" strokeLinecap="round" />
              </svg>
            }
          />
          <ServiceCard
            href="/lab-results"
            label="ผลตรวจ"
            alert={newResults > 0}
            badge={newResults > 0 ? newResults : null}
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 3h6v4a3 3 0 003 3v8a3 3 0 01-3 3H9a3 3 0 01-3-3v-8a3 3 0 003-3V3z" />
              </svg>
            }
          />
          <ServiceCard
            href="/booking/history"
            label="ประวัติการจอง"
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6" strokeLinecap="round" />
                <path d="M9 13h6M9 17h6" strokeLinecap="round" />
              </svg>
            }
          />
        </div>

        {/* --- SOS 1669 button --- */}
        <a
          href="tel:1669"
          className="mt-8 block w-full max-w-[200px] transition hover:scale-105 active:scale-95"
        >
          <Image
            src="/botton1669.png"
            alt="โทร 1669"
            width={200}
            height={80}
            className="h-auto w-full"
          />
        </a>
      </section>
    </main>
  );
}
