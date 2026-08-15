"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";
import Modal from "@/components/Modal";
import { api } from "@/lib/api";

type Booking = {
  id: string;
  symptoms: string | null;
  urgency: string | null;
  recommended_department: string | null;
  ai_recommendation: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  status: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "รอดำเนินการ",
  confirmed: "ยืนยันแล้ว",
  cancelled: "ยกเลิก",
  completed: "เสร็จสิ้น",
};

export default function BookingHistoryPage() {
  const [history, setHistory] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ bookings: Booking[] }>("/api/booking/history");
        setHistory(res.bookings);
      } catch {
        // non-fatal
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
        <span className="font-display text-base font-semibold">ประวัติการจอง</span>
      </header>

      <div className="relative z-10 mx-auto max-w-lg space-y-5 px-5 pt-20">
        <h2 className="font-display text-[15px] font-semibold text-ink">รายการทั้งหมด</h2>
        {loading ? (
          <p className="text-sm text-ink/50">กำลังโหลด...</p>
        ) : history.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-ink/50">ยังไม่มีประวัติการจอง</p>
            <Link href="/booking" className="btn-primary mt-4 inline-flex w-full">
              ไปจองคิว
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {history.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setSelectedBooking(b)}
                  className="card flex w-full items-center justify-between px-4 py-3 text-left text-sm transition hover:border-teal hover:bg-teal-light"
                >
                  <div>
                    <span>{new Date(b.created_at + "Z").toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</span>
                    {b.recommended_department && (
                      <span className="ml-2 text-xs text-teal-dark">{b.recommended_department}</span>
                    )}
                    {b.appointment_date && (
                      <p className="mt-0.5 text-[11px] text-ink/45">
                        นัด: {b.appointment_date} {b.appointment_time}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-ink/60">{STATUS_LABELS[b.status] || b.status}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink/30">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Booking Detail Modal */}
      <Modal open={!!selectedBooking} onClose={() => setSelectedBooking(null)} title="รายละเอียดการจอง">
        {selectedBooking && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink/50">หมายเลขคิว</span>
              <span className="font-mono font-semibold text-teal-dark">
                {selectedBooking.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">สถานะ</span>
              <span className="rounded-full bg-teal-light px-2.5 py-0.5 text-xs font-medium text-teal-dark">
                {STATUS_LABELS[selectedBooking.status] || selectedBooking.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">แผนกที่แนะนำ</span>
              <span className="font-medium text-ink">{selectedBooking.recommended_department || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">ความเร่งด่วน</span>
              <span className="font-medium text-ink">{selectedBooking.urgency || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">วันที่จอง</span>
              <span className="font-medium text-ink">
                {new Date(selectedBooking.created_at + "Z").toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">วันที่นัด</span>
              <span className="font-medium text-ink">
                {selectedBooking.appointment_date || "-"} {selectedBooking.appointment_time || ""} น.
              </span>
            </div>
            <div className="border-t border-line pt-3">
              <span className="text-ink/50">อาการ</span>
              <p className="mt-1 whitespace-pre-wrap text-ink">{selectedBooking.symptoms || "-"}</p>
            </div>
            {selectedBooking.ai_recommendation && (
              <div className="border-t border-line pt-3">
                <span className="text-ink/50">คำแนะนำจาก AI</span>
                <p className="mt-1 whitespace-pre-wrap text-ink">
                  {(() => {
                    try {
                      const a = JSON.parse(selectedBooking.ai_recommendation);
                      return a.advice || selectedBooking.ai_recommendation;
                    } catch {
                      return selectedBooking.ai_recommendation;
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
