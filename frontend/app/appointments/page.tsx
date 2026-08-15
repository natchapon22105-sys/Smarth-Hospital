"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";
import Modal from "@/components/Modal";
import { api } from "@/lib/api";

type Appointment = {
  id: string;
  symptoms: string | null;
  urgency: string | null;
  recommended_department: string | null;
  ai_recommendation: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  note: string | null;
  status: string;
  is_read: number;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "รอดำเนินการ",
  confirmed: "ยืนยันแล้ว",
  cancelled: "ยกเลิก",
  completed: "เสร็จสิ้น",
};

// แปลงวันที่ YYYY-MM-DD เป็นภาษาไทย เช่น 14 สิงหาคม 2569
function formatThaiDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00+07:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Bangkok",
  });
}

// แปลง HH:mm เป็น 08:30 น.
function formatThaiTime(timeStr: string | null): string {
  if (!timeStr) return "";
  return `${timeStr} น.`;
}

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  async function loadAppointments() {
    try {
      const res = await api.get<{ appointments: Appointment[] }>("/api/booking/appointments");
      setAppointments(res.appointments);
    } catch (err) {
      setError("โหลดนัดหมายไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  function openAppointment(a: Appointment) {
    setSelected(a);
    if (!a.is_read) {
      setAppointments((prev) => prev.map((x) => (x.id === a.id ? { ...x, is_read: 1 } : x)));
      api
        .post(`/api/booking/appointments/${a.id}/read`)
        .then(() => window.dispatchEvent(new Event("appointments-read")))
        .catch(() =>
          setAppointments((prev) => prev.map((x) => (x.id === a.id ? { ...x, is_read: 0 } : x)))
        );
    }
  }

  return (
    <main className="relative min-h-screen pb-16">
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat opacity-[0.15]"
        style={{ backgroundImage: 'url("/bg-booking.png")' }}
      />

      {/* Header fixed on top, overlays everything */}
      <header className="fixed inset-x-0 top-0 z-50 flex items-center gap-3 border-b border-line bg-surface/90 px-5 py-4 backdrop-blur-md">
        <HamburgerMenu />
        <Link href="/app-home" className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink transition hover:bg-teal-light hover:text-teal-dark" aria-label="กลับหน้าเลือกบริการ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12l9-9 9 9" />
            <path d="M5 10v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1v-9" />
          </svg>
        </Link>
        <span className="font-display text-base font-semibold">นัดหมายของฉัน</span>
      </header>

      <div className="relative z-10 mx-auto max-w-lg space-y-5 px-5 pt-20">
        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        {loading ? (
          <p className="text-sm text-ink/50">กำลังโหลด...</p>
        ) : appointments.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-light text-teal-dark">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 10h18" />
              </svg>
            </div>
            <p className="font-display text-[15px] font-semibold text-ink">ยังไม่มีนัดหมาย</p>
            <p className="mt-1 text-sm text-ink/50">
              เมื่อแพทย์นัดหมายให้คุณ จะแสดงวันที่และเวลาที่นี่
            </p>
            <Link href="/booking" className="btn-primary mt-4 inline-flex w-full">
              ไปจองคิว
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {appointments.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => openAppointment(a)}
                  className={`card relative flex w-full items-center gap-4 px-4 py-4 text-left transition hover:border-teal hover:bg-teal-light ${
                    !a.is_read ? "border-2 border-danger ring-2 ring-danger/20 bg-danger/5" : ""
                  }`}
                >
                  {/* Unread dot */}
                  {!a.is_read && (
                    <span className="absolute right-3 top-3 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75"></span>
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger"></span>
                    </span>
                  )}
                  {/* Date box */}
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-teal/25 bg-teal-light text-teal-dark">
                    <span className="text-lg font-bold leading-none">
                      {a.appointment_date ? Number(a.appointment_date.slice(8, 10)) : "-"}
                    </span>
                    <span className="mt-0.5 text-[10px]">
                      {a.appointment_date
                        ? new Date(a.appointment_date + "T00:00:00+07:00").toLocaleDateString("th-TH", {
                            month: "short",
                            timeZone: "Asia/Bangkok",
                          })
                        : ""}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[15px] font-semibold text-ink">
                      {a.recommended_department || "นัดหมาย"} · {formatThaiTime(a.appointment_time)}
                    </p>
                    <p className="mt-0.5 text-xs text-ink/55">
                      {formatThaiDate(a.appointment_date || "")}
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-teal-light px-2 py-0.5 text-[11px] font-medium text-teal-dark">
                      {STATUS_LABELS[a.status] || a.status}
                    </span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink/30">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Appointment Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="รายละเอียดนัดหมาย">
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-teal-light p-4 text-center">
              <p className="text-xs text-teal-dark/70">วันนัดหมาย</p>
              <p className="font-display text-lg font-semibold text-teal-dark">
                {formatThaiDate(selected.appointment_date || "")}
              </p>
              <p className="mt-1 text-sm font-medium text-teal-dark">
                เวลา {formatThaiTime(selected.appointment_time)}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">หมายเลขคิว</span>
              <span className="font-mono font-semibold text-teal-dark">
                {selected.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">สถานะ</span>
              <span className="rounded-full bg-teal-light px-2.5 py-0.5 text-xs font-medium text-teal-dark">
                {STATUS_LABELS[selected.status] || selected.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">แผนก</span>
              <span className="font-medium text-ink">{selected.recommended_department || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">ความเร่งด่วน</span>
              <span className="font-medium text-ink">{selected.urgency || "-"}</span>
            </div>
            {selected.note && (
              <div className="border-t border-line pt-3">
                <span className="text-ink/50">หมายเหตุจากแพทย์/เจ้าหน้าที่</span>
                <p className="mt-1 whitespace-pre-wrap text-ink">{selected.note}</p>
              </div>
            )}
            {selected.symptoms && (
              <div className="border-t border-line pt-3">
                <span className="text-ink/50">อาการ</span>
                <p className="mt-1 whitespace-pre-wrap text-ink">{selected.symptoms}</p>
              </div>
            )}
            {selected.ai_recommendation && (
              <div className="border-t border-line pt-3">
                <span className="text-ink/50">คำแนะนำ</span>
                <p className="mt-1 whitespace-pre-wrap text-ink">
                  {(() => {
                    try {
                      const a = JSON.parse(selected.ai_recommendation);
                      return a.advice || selected.ai_recommendation;
                    } catch {
                      return selected.ai_recommendation;
                    }
                  })()}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </main>
  );
}
