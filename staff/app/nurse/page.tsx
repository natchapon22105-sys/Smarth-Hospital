"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Modal from "@/components/Modal";
import { api, ApiError } from "@/lib/api";

type QueueBooking = {
  id: string;
  appointment_time: string;
  symptoms: string | null;
  urgency: string | null;
  recommended_department: string | null;
  status: string;
  created_at: string;
  username: string;
  email: string;
  phone: string | null;
  prefix_th: string | null;
  first_name_th: string | null;
  last_name_th: string | null;
  national_id: string | null;
};

type QueueStats = {
  total: number;
  checkedIn: number;
  completed: number;
  cancelled: number;
  pending: number;
  emergency: number;
  urgent: number;
};

const URGENCY_STYLES: Record<string, string> = {
  emergency: "bg-red-500 text-white",
  urgent: "bg-amber-500 text-white",
  routine: "bg-teal text-white",
  non_urgent: "bg-gray-400 text-white",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600 border-gray-300",
  confirmed: "bg-teal-light text-teal-dark border-teal/30",
  completed: "bg-green-100 text-green-700 border-green-300",
  cancelled: "bg-red-100 text-red-600 border-red-200",
};

export default function NursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [bookings, setBookings] = useState<QueueBooking[]>([]);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<QueueBooking | null>(null);

  useEffect(() => {
    loadQueue();
  }, [date]);

  async function loadQueue() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ stats: QueueStats; bookings: QueueBooking[] }>(
        `/api/nurse/queue?date=${date}`
      );
      setStats(res.stats);
      setBookings(res.bookings);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (ต้องการสิทธิ์พยาบาล)");
        setTimeout(() => router.push("/nurse/login"), 2000);
      } else {
        setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    setStatusUpdating(id);
    setError(null);
    try {
      await api.put(`/api/nurse/queue/${id}/status`, { status: newStatus });
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
      );
      // Refresh stats
      loadQueue();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setStatusUpdating(null);
    }
  }

  function getPatientName(b: QueueBooking): string {
    const parts = [b.prefix_th, b.first_name_th, b.last_name_th].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : b.username;
  }

  return (
    <main className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-line bg-surface px-5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/nurse/login")} className="text-sm text-teal hover:underline">
            ← กลับ
          </button>
          <span className="font-display text-lg font-semibold text-ink">ระบบคิว — พยาบาล</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="field-input w-auto text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-5 px-5 py-6">
        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-4 gap-3 md:grid-cols-7">
            {[
              { label: "ทั้งหมด", value: stats.total, color: "text-ink" },
              { label: "เช็คอินแล้ว", value: stats.checkedIn, color: "text-teal" },
              { label: "เสร็จสิ้น", value: stats.completed, color: "text-green-600" },
              { label: "รอ", value: stats.pending, color: "text-amber" },
              { label: "ฉุกเฉิน", value: stats.emergency, color: "text-red-600" },
              { label: "เร่งด่วน", value: stats.urgent, color: "text-amber" },
              { label: "ยกเลิก", value: stats.cancelled, color: "text-ink/40" },
            ].map((s) => (
              <div key={s.label} className="card p-3 text-center">
                <p className="text-xl font-bold font-mono">{s.value}</p>
                <p className="mt-0.5 text-[11px] text-ink/60">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Queue list */}
        {loading ? (
          <p className="text-sm text-ink/50">กำลังโหลด...</p>
        ) : bookings.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-ink/40">ไม่มีคิวในวันที่เลือก</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div
                key={b.id}
                className={`card p-4 border-l-4 ${
                  b.urgency === "emergency"
                    ? "border-l-red-500"
                    : b.urgency === "urgent"
                    ? "border-l-amber-500"
                    : "border-l-teal"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: time + name */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold font-mono text-ink">
                        {b.appointment_time}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          URGENCY_STYLES[b.urgency ?? ""] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {b.urgency === "emergency"
                          ? "ฉุกเฉิน"
                          : b.urgency === "urgent"
                          ? "เร่งด่วน"
                          : b.urgency === "routine"
                          ? "ทั่วไป"
                          : "ไม่เร่งด่วน"}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] ${
                          STATUS_STYLES[b.status] || ""
                        }`}
                      >
                        {b.status === "confirmed"
                          ? "เช็คอินแล้ว"
                          : b.status === "completed"
                          ? "เสร็จสิ้น"
                          : b.status === "cancelled"
                          ? "ยกเลิก"
                          : "รอ"}
                      </span>
                    </div>
                    <p className="mt-1 text-base font-semibold text-ink">
                      {getPatientName(b)}
                    </p>
                    {b.symptoms && (
                      <p className="mt-0.5 text-sm text-ink/60 line-clamp-2">
                        อาการ: {b.symptoms}
                      </p>
                    )}
                    {b.recommended_department && (
                      <p className="mt-0.5 text-xs text-teal-dark">
                        แผนก: {b.recommended_department}
                      </p>
                    )}
                  </div>

                  {/* Right: action buttons */}
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      onClick={() => setSelectedBooking(b)}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink/70 hover:bg-line"
                    >
                      ดูรายละเอียด
                    </button>
                    {b.status === "pending" && (
                      <button
                        onClick={() => handleStatusChange(b.id, "confirmed")}
                        disabled={statusUpdating === b.id}
                        className="btn-primary px-3 py-1.5 text-xs"
                      >
                        เช็คอิน
                      </button>
                    )}
                    {b.status === "confirmed" && (
                      <button
                        onClick={() => handleStatusChange(b.id, "completed")}
                        disabled={statusUpdating === b.id}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                      >
                        เสร็จสิ้น
                      </button>
                    )}
                    {(b.status === "pending" || b.status === "confirmed") && (
                      <button
                        onClick={() => handleStatusChange(b.id, "cancelled")}
                        disabled={statusUpdating === b.id}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                      >
                        ยกเลิก
                      </button>
                    )}
                    {b.status === "completed" && (
                      <span className="rounded-lg bg-green-100 px-3 py-1.5 text-xs text-green-700">
                        ✓
                      </span>
                    )}
                    {b.status === "cancelled" && (
                      <span className="rounded-lg bg-red-100 px-3 py-1.5 text-xs text-red-600">
                        ✕
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Booking Detail Modal ---- */}
      <Modal open={!!selectedBooking} onClose={() => setSelectedBooking(null)} title="รายละเอียดผู้รับคิว">
        {selectedBooking && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white/50">เวลานัด</span>
              <span className="font-mono font-semibold text-white/90">{selectedBooking.appointment_time} น.</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">สถานะ</span>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  STATUS_STYLES[selectedBooking.status] || ""
                }`}
              >
                {selectedBooking.status === "confirmed"
                  ? "เช็คอินแล้ว"
                  : selectedBooking.status === "completed"
                  ? "เสร็จสิ้น"
                  : selectedBooking.status === "cancelled"
                  ? "ยกเลิก"
                  : "รอ"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">ความเร่งด่วน</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  URGENCY_STYLES[selectedBooking.urgency ?? ""] || "bg-gray-100 text-gray-600"
                }`}
              >
                {selectedBooking.urgency === "emergency"
                  ? "ฉุกเฉิน"
                  : selectedBooking.urgency === "urgent"
                  ? "เร่งด่วน"
                  : selectedBooking.urgency === "routine"
                  ? "ทั่วไป"
                  : "ไม่เร่งด่วน"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">ชื่อผู้ป่วย</span>
              <span className="font-medium text-white/90">{getPatientName(selectedBooking)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">เลขบัตรประชาชน</span>
              <span className="font-mono text-white/90">{selectedBooking.national_id || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">เบอร์โทร</span>
              <span className="font-mono text-white/90">{selectedBooking.phone || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">อีเมล</span>
              <span className="text-white/90">{selectedBooking.email || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">แผนกที่แนะนำ</span>
              <span className="font-medium text-navy-accent">
                {selectedBooking.recommended_department || "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">วันที่จอง</span>
              <span className="text-white/90">
                {new Date(selectedBooking.created_at).toLocaleString("th-TH")}
              </span>
            </div>
            <div className="border-t border-white/10 pt-3">
              <span className="text-white/50">อาการ</span>
              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-white/5 p-3 text-white/80">{selectedBooking.symptoms || "-"}</p>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
