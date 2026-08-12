"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import HamburgerMenu from "@/components/HamburgerMenu";
import Modal from "@/components/Modal";
import { api, ApiError } from "@/lib/api";

type LabResult = {
  id: string;
  test_name: string;
  category: string;
  result_value: string | null;
  unit: string | null;
  ref_range: string | null;
  flag: "normal" | "high" | "low" | "critical";
  note: string | null;
  doctor_name: string | null;
  test_date: string;
  is_read: number;
  created_at: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  general: "ทั่วไป",
  blood: "เลือด",
  xray: "เอกซเรย์",
  ultrasound: "อัลตราซาวนด์",
  other: "อื่น ๆ",
};

const FLAG_STYLES: Record<string, { label: string; cls: string }> = {
  normal: { label: "ปกติ", cls: "bg-green-100 text-green-700 border-green-300" },
  high: { label: "สูงกว่าเกณฑ์", cls: "bg-amber-100 text-amber-700 border-amber-300" },
  low: { label: "ต่ำกว่าเกณฑ์", cls: "bg-blue-100 text-blue-700 border-blue-300" },
  critical: { label: "วิกฤต", cls: "bg-red-100 text-red-700 border-red-300" },
};

// แปลงวันที่ UTC จาก SQLite (รูปแบบ "YYYY-MM-DD HH:MM:SS") เป็นเวลาไทย (UTC+7)
function formatThaiDate(iso: string): string {
  if (!iso) return "-";
  // SQLite datetime() คืนค่า UTC ที่ไม่มี timezone → เติม "Z" เพื่อบอกว่าเป็น UTC
  const d = new Date(iso.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

export default function LabResultsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<LabResult[]>([]);
  const [selected, setSelected] = useState<LabResult | null>(null);

  useEffect(() => {
    loadResults();
  }, []);

  // เปิดดูผลตรวจ + ทำเครื่องหมาย "อ่านแล้ว" (ให้ไฮไลท์ที่หน้าแรกหายไป)
  function openResult(r: LabResult) {
    setSelected(r);
    if (!r.is_read) {
      // อัปเดตสถานะในหน้าทันที (ไม่รอ network)
      setResults((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_read: 1 } : x)));
      api
        .post(`/api/lab/results/${r.id}/read`)
        .catch(() => {
          // ถ้าส่งไม่สำเร็จ คืนสถานะเดิม
          setResults((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_read: 0 } : x)));
        });
    }
  }

  async function loadResults() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ results: LabResult[] }>("/api/lab/results");
      setResults(res.results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "โหลดผลตรวจไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen pb-24">
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat opacity-[0.06]"
        style={{ backgroundImage: 'url("/usebackground.png")' }}
      />

      <header className="relative z-10 flex items-center gap-3 px-5 py-4">
        <HamburgerMenu />
        <Link href="/app-home" className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink transition hover:bg-teal-light hover:text-teal-dark" aria-label="กลับหน้าเลือกบริการ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12l9-9 9 9" />
            <path d="M5 10v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1v-9" />
          </svg>
        </Link>
        <span className="font-display text-base font-semibold">ผลตรวจ</span>
      </header>

      <div className="relative z-10 mx-auto max-w-lg space-y-4 px-5">
        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        {loading ? (
          <p className="text-sm text-ink/50">กำลังโหลด...</p>
        ) : results.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-teal-light text-teal-dark">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 3h6v4a3 3 0 003 3v8a3 3 0 01-3 3H9a3 3 0 01-3-3v-8a3 3 0 003-3V3z" />
              </svg>
            </div>
            <p className="text-ink/50">ยังไม่มีผลตรวจในระบบ</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {results.map((r) => {
              const flag = FLAG_STYLES[r.flag] || FLAG_STYLES.normal;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => openResult(r)}
                    className="card flex w-full items-center justify-between px-4 py-3 text-left transition hover:border-teal hover:bg-teal-light"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{r.test_name}</p>
                      <p className="mt-0.5 text-[11px] text-ink/45">
                        {CATEGORY_LABELS[r.category] || r.category} · {formatThaiDate(r.test_date)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${flag.cls}`}>
                        {flag.label}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink/30">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="รายละเอียดผลตรวจ">
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink/50">การตรวจ</span>
              <span className="font-medium text-ink">{selected.test_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">หมวดหมู่</span>
              <span className="text-ink">{CATEGORY_LABELS[selected.category] || selected.category}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">วันที่ตรวจ</span>
              <span className="text-ink">{formatThaiDate(selected.test_date)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">ผล</span>
              <span className="font-mono font-semibold text-ink">
                {selected.result_value || "-"}
                {selected.unit ? ` ${selected.unit}` : ""}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">เกณฑ์ปกติ</span>
              <span className="font-mono text-ink">{selected.ref_range || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">สถานะ</span>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${(FLAG_STYLES[selected.flag] || FLAG_STYLES.normal).cls}`}>
                {(FLAG_STYLES[selected.flag] || FLAG_STYLES.normal).label}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/50">ผู้ออกผล</span>
              <span className="text-ink">{selected.doctor_name || "-"}</span>
            </div>
            {selected.note && (
              <div className="border-t border-line pt-3">
                <span className="text-ink/50">หมายเหตุ</span>
                <p className="mt-1 whitespace-pre-wrap text-ink">{selected.note}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Floating SOS 1669 */}
      <a
        href="tel:1669"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 transition hover:scale-110 active:scale-95"
      >
        <Image src="/botton1669.png" alt="โทร 1669" width={56} height={56} className="h-full w-full" />
      </a>
    </main>
  );
}
