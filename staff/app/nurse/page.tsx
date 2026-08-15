"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  queue_number: string;
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

const BUSINESS_HOURS = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30"];

const URGENCY_STYLES: Record<string, string> = {
  emergency: "bg-red-500 text-white",
  urgent: "bg-amber-500 text-white",
  routine: "bg-teal text-white",
  non_urgent: "bg-gray-400 text-white",
};

export default function NursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(new Date(new Date().getTime() + 7 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [bookings, setBookings] = useState<QueueBooking[]>([]);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<QueueBooking | null>(null);
  const [slotModal, setSlotModal] = useState<{ time: string; bookings: QueueBooking[] } | null>(null);

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
        setError("คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (ต้องการเวชระเบียน)");
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
      // อัปเดตทั้ง bookings และ slotModal
      const update = (prev: QueueBooking[]) =>
        prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b));
      setBookings(update);
      if (slotModal) setSlotModal((prev) => prev ? { ...prev, bookings: update(prev.bookings) } : null);
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

  // Group bookings by time slot
  const timeSlots = useMemo(() => {
    const map = new Map<string, QueueBooking[]>();
    for (const time of BUSINESS_HOURS) {
      map.set(time, []);
    }
    for (const b of bookings) {
      const existing = map.get(b.appointment_time) || [];
      existing.push(b);
      map.set(b.appointment_time, existing);
    }
    return map;
  }, [bookings]);

  const morningSlots = BUSINESS_HOURS.filter((t) => t < "12:00");
  const afternoonSlots = BUSINESS_HOURS.filter((t) => t >= "12:00");

  function renderSlotCard(time: string, slotBookings: QueueBooking[]) {
    const hasBookings = slotBookings.length > 0;
    return (
      <button
        key={time}
        type="button"
        onClick={() => setSlotModal({ time, bookings: slotBookings })}
        className={`w-full rounded-xl border-2 p-0 text-left transition hover:shadow-md ${
          hasBookings
            ? "border-teal/30 bg-white shadow-sm"
            : "border-dashed border-line/50 bg-surface/50"
        }`}
      >
        <div className={`flex items-center justify-between rounded-t-xl px-3 py-2 ${
          hasBookings ? "bg-teal-light" : "bg-gray-50"
        }`}>
          <span className="font-display text-sm font-bold text-ink">{time}</span>
          {hasBookings && (
            <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-medium text-teal-dark">
              {slotBookings.length} คิว
            </span>
          )}
          {!hasBookings && (
            <span className="text-[10px] text-ink/30">ว่าง</span>
          )}
        </div>
        <div className="p-2">
          {hasBookings ? (
            <div className="space-y-1">
              {slotBookings.slice(0, 3).map((b) => (
                <div key={b.id} className="flex items-center gap-1.5 text-[11px] text-ink/70">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                    b.urgency === "emergency" ? "bg-red-500" : b.urgency === "urgent" ? "bg-amber-500" : "bg-teal"
                  }`} />
                  <span className="font-mono text-[10px] font-bold text-teal-dark">{b.queue_number}</span>
                  <span className="truncate">{getPatientName(b)}</span>
                  <span className={`ml-auto shrink-0 text-[10px] ${
                    b.status === "confirmed" ? "text-teal-dark" : b.status === "completed" ? "text-green-600" : b.status === "cancelled" ? "text-red-500" : "text-gray-400"
                  }`}>
                    {b.status === "confirmed" ? "เช็คอิน" : b.status === "completed" ? "เสร็จ" : b.status === "cancelled" ? "ยกเลิก" : "รอ"}
                  </span>
                </div>
              ))}
              {slotBookings.length > 3 && (
                <p className="text-[10px] text-ink/40 text-center pt-1 border-t border-dashed border-line/50">
                  + อีก {slotBookings.length - 3} คิว
                </p>
              )}
            </div>
          ) : (
            <div className="py-3 text-center text-[10px] text-ink/20">—</div>
          )}
        </div>
      </button>
    );
  }

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

      <header className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/nurse/login")} className="text-sm text-teal hover:underline">
            ← กลับ
          </button>
          <span className="font-display text-lg font-semibold text-ink">ระบบคิว — เวชระเบียน</span>
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

      <div className="relative mx-auto max-w-5xl space-y-5 px-5 py-6">
        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

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
                <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
                <p className="mt-0.5 text-[11px] text-ink/60">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-ink/50">กำลังโหลด...</p>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-ink/60">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                ช่วงเช้า (08:00 - 11:30)
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {morningSlots.map((time) => renderSlotCard(time, timeSlots.get(time) || []))}
              </div>
            </div>
            <div>
              <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-white/60">
                <span className="inline-block h-2 w-2 rounded-full bg-teal" />
                ช่วงบ่าย (13:00 - 16:30)
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {afternoonSlots.map((time) => renderSlotCard(time, timeSlots.get(time) || []))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---- Slot Detail Modal ---- */}
      <Modal open={!!slotModal} onClose={() => setSlotModal(null)} title={slotModal ? `เวลา ${slotModal.time} น.` : ""}>
        {slotModal && (
          <div className="space-y-2">
            {slotModal.bookings.length === 0 ? (
              <p className="py-4 text-center text-sm text-white/40">ไม่มีคิวในช่วงเวลานี้</p>
            ) : (
              slotModal.bookings.map((b) => (
                <div
                  key={b.id}
                  className={`rounded-lg border-l-4 p-3 text-xs transition ${
                    b.urgency === "emergency"
                      ? "border-l-red-500 bg-red-50"
                      : b.urgency === "urgent"
                      ? "border-l-amber-500 bg-amber-50"
                      : "border-l-teal bg-gray-50"
                  } ${b.status === "cancelled" ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-dark">{b.queue_number}</span>
                      <span className="font-medium text-ink">{getPatientName(b)}</span>
                    </div>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      b.status === "confirmed" ? "bg-teal/10 text-teal-dark" : b.status === "completed" ? "bg-green-100 text-green-700" : b.status === "cancelled" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
                    }`}>
                      {b.status === "confirmed" ? "เช็คอิน" : b.status === "completed" ? "เสร็จ" : b.status === "cancelled" ? "ยกเลิก" : "รอ"}
                    </span>
                  </div>
                  {b.recommended_department && (
                    <p className="mt-1 text-[10px] text-teal">{b.recommended_department}</p>
                  )}
                  <div className="mt-1.5 flex gap-1">
                    <button
                      onClick={() => { setSelectedBooking(b); setSlotModal(null); }}
                      className="rounded border border-line px-2 py-1 text-[10px] text-ink/60 hover:bg-line/50"
                    >
                      รายละเอียด
                    </button>
                    {b.status === "pending" && (
                      <button
                        onClick={() => { handleStatusChange(b.id, "confirmed"); }}
                        className="rounded bg-teal px-2 py-1 text-[10px] font-medium text-white hover:bg-teal-dark"
                      >
                        เช็คอิน
                      </button>
                    )}
                    {b.status === "confirmed" && (
                      <button
                        onClick={() => { handleStatusChange(b.id, "completed"); }}
                        className="rounded bg-green-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-green-700"
                      >
                        เสร็จ
                      </button>
                    )}
                    {(b.status === "pending" || b.status === "confirmed") && (
                      <button
                        onClick={() => { handleStatusChange(b.id, "cancelled"); }}
                        className="rounded border border-red-300 px-2 py-1 text-[10px] text-red-500 hover:bg-red-50"
                      >
                        ยกเลิก
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Modal>

      {/* ---- Booking Detail Modal ---- */}
      <Modal open={!!selectedBooking} onClose={() => setSelectedBooking(null)} title="รายละเอียดผู้รับคิว">
        {selectedBooking && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink/50">หมายเลขคิว</span>
              <span className="font-mono text-lg font-bold text-teal-dark">{selectedBooking.queue_number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">เวลานัด</span>
              <span className="font-mono font-semibold text-ink">{selectedBooking.appointment_time} น.</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">สถานะ</span>
              <span className={`rounded-full border px-2 py-0.5 text-xs ${selectedBooking.status === "confirmed" ? "bg-teal-light text-teal-dark border-teal/30" : selectedBooking.status === "completed" ? "bg-green-100 text-green-700 border-green-300" : selectedBooking.status === "cancelled" ? "bg-red-100 text-red-600 border-red-200" : "bg-gray-100 text-gray-600 border-gray-300"}`}>
                {selectedBooking.status === "confirmed" ? "เช็คอินแล้ว" : selectedBooking.status === "completed" ? "เสร็จสิ้น" : selectedBooking.status === "cancelled" ? "ยกเลิก" : "รอ"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">ความเร่งด่วน</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${URGENCY_STYLES[selectedBooking.urgency ?? ""] || "bg-gray-100 text-gray-600"}`}>
                {selectedBooking.urgency === "emergency" ? "ฉุกเฉิน" : selectedBooking.urgency === "urgent" ? "เร่งด่วน" : selectedBooking.urgency === "routine" ? "ทั่วไป" : "ไม่เร่งด่วน"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">ชื่อผู้ป่วย</span>
              <span className="font-medium text-ink">{getPatientName(selectedBooking)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">เลขบัตรประชาชน</span>
              <span className="font-mono text-ink">{selectedBooking.national_id || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">เบอร์โทร</span>
              <span className="font-mono text-ink">{selectedBooking.phone || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">อีเมล</span>
              <span className="text-ink">{selectedBooking.email || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">แผนกที่แนะนำ</span>
              <span className="font-medium text-teal">{selectedBooking.recommended_department || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">วันที่จอง</span>
              <span className="text-ink">{new Date(selectedBooking.created_at + "Z").toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</span>
            </div>
            <div className="border-t border-line pt-3">
              <span className="text-ink/50">อาการ</span>
              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-ink/80">{selectedBooking.symptoms || "-"}</p>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}