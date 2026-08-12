"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

export default function AdminUsagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/admin/usage");
      setUsage(res);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (ต้องการสิทธิ์ผู้ดูแลระบบ)");
        setTimeout(() => router.push("/admin/login"), 2000);
      } else {
        setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none fixed inset-0 -z-10 animate-bg-pan bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/usebackground.png")' }}
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-navy-deeper via-navy-dark to-navy" />
      <div className="pointer-events-none fixed inset-0 -z-10 animate-pulse-glow bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.25),transparent_55%)]" />

      <header className="flex animate-fade-in-up items-center gap-3 border-b border-white/10 bg-navy/40 px-5 py-4 backdrop-blur-md">
        <button onClick={() => router.push("/admin")} className="text-sm text-navy-accent hover:text-white hover:underline">
          ← หน้าหลัก
        </button>
        <span className="font-display text-lg font-semibold text-white/90 drop-shadow">สถิติการใช้งาน</span>
      </header>

      <div className="mx-auto max-w-4xl space-y-5 px-5 py-6 animate-fade-in-up">
        {error && (
          <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        {loading ? (
          <p className="text-sm text-white/50">กำลังโหลด...</p>
        ) : usage ? (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: "ผู้ใช้ทั้งหมด", value: usage.usage.totalUsers },
                { label: "ผู้ดูแลระบบ", value: usage.usage.totalAdmins },
                { label: "การจองทั้งหมด", value: usage.usage.totalBookings },
                { label: "จองวันนี้", value: usage.usage.todayBookings },
              ].map((card) => (
                <div key={card.label} className="rounded-xl2 border border-white/10 bg-navy/40 p-4 text-center shadow-navy-card backdrop-blur-md">
                  <p className="text-2xl font-bold font-mono text-navy-accent">{card.value}</p>
                  <p className="mt-1 text-xs text-white/60">{card.label}</p>
                </div>
              ))}
            </div>

            {usage.monthlyBookings?.length > 0 && (
              <div className="rounded-xl2 border border-white/10 bg-navy/40 p-5 shadow-navy-card backdrop-blur-md">
                <h2 className="mb-3 font-display text-[15px] font-semibold text-white/90">การจองรายเดือน</h2>
                <div className="space-y-2">
                  {usage.monthlyBookings.map((m: any) => (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="w-20 text-sm text-white/70">{m.month}</span>
                      <div className="flex-1 rounded-full bg-white/10">
                        <div className="rounded-full bg-navy-accent py-1 text-center text-xs text-white shadow-navy-glow" style={{ width: `${Math.min(100, (m.count / 50) * 100)}%` }}>{m.count}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}
