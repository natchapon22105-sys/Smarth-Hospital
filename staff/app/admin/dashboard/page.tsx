"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import Modal from "@/components/Modal";
import DepartmentPieChart from "@/components/DepartmentPieChart";

type DashboardData = {
  stats: {
    totalPatients: number;
    totalBookings: number;
    todayBookings: number;
    pendingBookings: number;
    confirmedToday: number;
  };
  bookingsPerDay: { day: string; count: number }[];
  deptStats: { recommended_department: string; count: number }[];
  recentBookings: any[];
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<DashboardData>("/api/admin/dashboard");
      setDashboard(res);
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
      {/* Animated background image */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 animate-bg-pan bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/usebackground.png")' }}
      />
      {/* Navy gradient overlay */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-navy-deeper via-navy-dark to-navy" />
      <div className="pointer-events-none fixed inset-0 -z-10 animate-pulse-glow bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.25),transparent_55%)]" />

      <header className="flex animate-fade-in-up items-center gap-3 border-b border-white/10 bg-navy/40 px-5 py-4 backdrop-blur-md">
        <button onClick={() => router.push("/admin")} className="text-sm text-navy-accent hover:text-white hover:underline">
          ← หน้าหลัก
        </button>
        <span className="font-display text-lg font-semibold text-white/90 drop-shadow">แดชบอร์ด</span>
      </header>

      <div className="mx-auto max-w-4xl space-y-5 px-5 py-6 animate-fade-in-up">
        {error && (
          <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        {loading ? (
          <p className="text-sm text-white/50">กำลังโหลด...</p>
        ) : dashboard ? (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {[
                { label: "คนไข้ทั้งหมด", value: dashboard.stats.totalPatients, color: "text-navy-accent" },
                { label: "จองทั้งหมด", value: dashboard.stats.totalBookings, color: "text-navy-accent" },
                { label: "จองวันนี้", value: dashboard.stats.todayBookings, color: "text-amber" },
                { label: "รอดำเนินการ", value: dashboard.stats.pendingBookings, color: "text-amber" },
                { label: "นัดวันนี้", value: dashboard.stats.confirmedToday, color: "text-green-400" },
              ].map((card) => (
                <div key={card.label} className="rounded-xl2 border border-white/10 bg-navy/40 p-4 text-center shadow-navy-card backdrop-blur-md">
                  <p className={`text-2xl font-bold font-mono ${card.color}`}>{card.value}</p>
                  <p className="mt-1 text-xs text-white/60">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Department pie chart */}
            <div className="rounded-xl2 border border-white/10 bg-navy/40 p-5 shadow-navy-card backdrop-blur-md">
              <h2 className="mb-3 font-display text-[15px] font-semibold text-white/90">สัดส่วนการจองตามแผนก</h2>
              <DepartmentPieChart
                data={(dashboard.deptStats || []).map((d: any) => ({
                  name: d.recommended_department || "ไม่ระบุ",
                  value: d.count,
                }))}
              />
            </div>

            {/* Recent bookings */}
            <div className="rounded-xl2 border border-white/10 bg-navy/40 p-5 shadow-navy-card backdrop-blur-md">
              <h2 className="mb-3 font-display text-[15px] font-semibold text-white/90">รายการจองล่าสุด</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50">
                      <th className="pb-2 pr-3 font-medium">วันที่</th>
                      <th className="pb-2 pr-3 font-medium">ผู้ใช้</th>
                      <th className="pb-2 pr-3 font-medium">แผนก</th>
                      <th className="pb-2 pr-3 font-medium">ความเร่งด่วน</th>
                      <th className="pb-2 font-medium">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recentBookings.map((b: any) => (
                      <tr
                        key={b.id}
                        onClick={() => setSelectedBooking(b)}
                        className="cursor-pointer border-b border-white/5 transition hover:bg-white/5"
                      >
                        <td className="py-2 pr-3 text-white/70">{new Date(b.created_at + "Z").toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</td>
                        <td className="py-2 pr-3 text-white/70">{b.username || b.email}</td>
                        <td className="py-2 pr-3 text-navy-accent">{b.recommended_department || "-"}</td>
                        <td className="py-2 pr-3">
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{b.urgency || "-"}</span>
                        </td>
                        <td className="py-2 text-white/70">{b.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Booking detail modal */}
      <Modal open={!!selectedBooking} onClose={() => setSelectedBooking(null)} title="รายละเอียดผู้รับคิว">
        {selectedBooking && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-white/50">ผู้ใช้</p>
                <p className="text-white/90">{selectedBooking.username || "-"}</p>
              </div>
              <div>
                <p className="text-white/50">อีเมล</p>
                <p className="text-white/90">{selectedBooking.email || "-"}</p>
              </div>
              <div>
                <p className="text-white/50">แผนกที่แนะนำ</p>
                <p className="text-navy-accent">{selectedBooking.recommended_department || "-"}</p>
              </div>
              <div>
                <p className="text-white/50">ความเร่งด่วน</p>
                <p className="text-white/90">{selectedBooking.urgency || "-"}</p>
              </div>
              <div>
                <p className="text-white/50">วันนัด</p>
                <p className="text-white/90">{selectedBooking.appointment_date || "-"}</p>
              </div>
              <div>
                <p className="text-white/50">เวลานัด</p>
                <p className="text-white/90">{selectedBooking.appointment_time || "-"}</p>
              </div>
              <div>
                <p className="text-white/50">สถานะ</p>
                <p className="text-white/90">{selectedBooking.status}</p>
              </div>
              <div>
                <p className="text-white/50">วันที่สร้าง</p>
                <p className="text-white/90">{new Date(selectedBooking.created_at + "Z").toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</p>
              </div>
            </div>
            <div>
              <p className="text-white/50">อาการ</p>
              <p className="whitespace-pre-wrap rounded-lg bg-white/5 p-3 text-white/80">{selectedBooking.symptoms || "-"}</p>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
