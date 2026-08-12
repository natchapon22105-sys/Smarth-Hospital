"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

type Patient = {
  id: string;
  national_id: string | null;
  prefix_th: string | null;
  first_name_th: string | null;
  last_name_th: string | null;
  email: string;
  phone: string;
  full_name: string | null;
};

const CATEGORIES = [
  { value: "general", label: "ทั่วไป" },
  { value: "blood", label: "เลือด" },
  { value: "xray", label: "เอกซเรย์" },
  { value: "ultrasound", label: "อัลตราซาวนด์" },
  { value: "other", label: "อื่น ๆ" },
];

const FLAGS = [
  { value: "normal", label: "ปกติ" },
  { value: "high", label: "สูงกว่าเกณฑ์" },
  { value: "low", label: "ต่ำกว่าเกณฑ์" },
  { value: "critical", label: "วิกฤต" },
];

function patientLabel(p: Patient): string {
  const name = p.full_name || `${p.prefix_th || ""}${p.first_name_th || ""} ${p.last_name_th || ""}`.trim();
  return name || p.email;
}

export default function SendLabPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // search
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);

  // form
  const [testName, setTestName] = useState("");
  const [category, setCategory] = useState("general");
  const [resultValue, setResultValue] = useState("");
  const [unit, setUnit] = useState("");
  const [refRange, setRefRange] = useState("");
  const [flag, setFlag] = useState("normal");
  const [note, setNote] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [testDate, setTestDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/api/admin/dashboard")
      .then(() => setChecking(false))
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.push("/admin/login?next=/admin/send-lab");
        } else {
          setChecking(false);
        }
      });
  }, [router]);

  // debounce search
  useEffect(() => {
    if (query.trim().length < 2) {
      setPatients([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get<{ patients: Patient[] }>(
          `/api/lab/patients/search?q=${encodeURIComponent(query.trim())}`
        );
        setPatients(res.patients);
      } catch {
        setPatients([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selected) {
      setError("กรุณาเลือกผู้ป่วย");
      return;
    }
    if (!testName.trim()) {
      setError("กรุณาระบุชื่อการตรวจ");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ message: string }>("/api/lab/results", {
        patientId: selected.id,
        test_name: testName.trim(),
        category,
        result_value: resultValue.trim() || null,
        unit: unit.trim() || null,
        ref_range: refRange.trim() || null,
        flag,
        note: note.trim() || null,
        doctor_name: doctorName.trim() || null,
        test_date: testDate,
      });
      setSuccess(res.message || "บันทึกและส่งผลตรวจเรียบร้อยแล้ว");
      // reset form
      setTestName("");
      setResultValue("");
      setUnit("");
      setRefRange("");
      setNote("");
      setFlag("normal");
      setCategory("general");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ส่งผลตรวจไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy-deeper">
        <p className="text-white/60">กำลังตรวจสอบสิทธิ์...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-navy-deeper pb-16">
      <header className="flex items-center gap-3 border-b border-white/10 bg-navy px-5 py-4">
        <button
          onClick={() => router.push("/admin")}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/80 transition hover:bg-white/10"
          aria-label="กลับ"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="font-display text-lg font-semibold text-white">ส่งผลตรวจให้คนไข้</span>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 px-5 py-6">
        {error && (
          <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-red-300">{error}</p>
        )}
        {success && (
          <div className="rounded-lg bg-teal/15 px-3 py-2 text-sm text-teal-light">
            ✅ {success}
          </div>
        )}

        {/* Step 1: เลือกคนไข้ */}
        <section className="rounded-xl2 border border-white/10 bg-navy-dark p-5">
          <h2 className="mb-3 font-display text-base font-semibold text-white">1. เลือกคนไข้</h2>
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อ / เลขบัตรประชาชน / เบอร์โทร / อีเมล"
              className="w-full rounded-lg border border-white/10 bg-navy-deeper px-4 py-2.5 text-white placeholder-white/40 outline-none focus:border-teal"
            />
            {searching && (
              <span className="absolute right-3 top-3 text-xs text-white/40">กำลังค้นหา...</span>
            )}
          </div>

          {patients.length > 0 && !selected && (
            <ul className="mt-2 max-h-60 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-navy-deeper p-1">
              {patients.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(p);
                      setPatients([]);
                      setQuery(patientLabel(p));
                    }}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-white/90 transition hover:bg-white/10"
                  >
                    <span>
                      <span className="font-medium">{patientLabel(p)}</span>
                      <span className="ml-2 text-xs text-white/40">{p.email}</span>
                    </span>
                    {p.national_id && (
                      <span className="text-xs text-white/40">{p.national_id}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selected && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-teal/40 bg-teal/10 px-4 py-3">
              <div>
                <p className="font-medium text-white">{patientLabel(selected)}</p>
                <p className="text-xs text-white/50">{selected.email} · {selected.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setQuery("");
                }}
                className="text-xs text-white/50 underline hover:text-white"
              >
                เปลี่ยน
              </button>
            </div>
          )}
        </section>

        {/* Step 2: กรอกผลตรวจ */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl2 border border-white/10 bg-navy-dark p-5">
          <h2 className="font-display text-base font-semibold text-white">2. รายละเอียดผลตรวจ</h2>

          <div>
            <label className="mb-1 block text-sm text-white/70">ชื่อการตรวจ *</label>
            <input
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="เช่น CBC, ไขมันในเลือด, เอกซเรย์ปอด"
              className="w-full rounded-lg border border-white/10 bg-navy-deeper px-4 py-2.5 text-white placeholder-white/40 outline-none focus:border-teal"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-white/70">หมวดหมู่</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-navy-deeper px-3 py-2.5 text-white outline-none focus:border-teal"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">สถานะ</label>
              <select
                value={flag}
                onChange={(e) => setFlag(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-navy-deeper px-3 py-2.5 text-white outline-none focus:border-teal"
              >
                {FLAGS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm text-white/70">ผลตรวจ</label>
              <input
                value={resultValue}
                onChange={(e) => setResultValue(e.target.value)}
                placeholder="ค่า"
                className="w-full rounded-lg border border-white/10 bg-navy-deeper px-3 py-2.5 text-white placeholder-white/40 outline-none focus:border-teal"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">หน่วย</label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="mg/dL"
                className="w-full rounded-lg border border-white/10 bg-navy-deeper px-3 py-2.5 text-white placeholder-white/40 outline-none focus:border-teal"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">เกณฑ์ปกติ</label>
              <input
                value={refRange}
                onChange={(e) => setRefRange(e.target.value)}
                placeholder="70-100"
                className="w-full rounded-lg border border-white/10 bg-navy-deeper px-3 py-2.5 text-white placeholder-white/40 outline-none focus:border-teal"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-white/70">วันที่ตรวจ *</label>
              <input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-navy-deeper px-3 py-2.5 text-white outline-none focus:border-teal"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">ผู้ออกผล</label>
              <input
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="ชื่อแพทย์/เจ้าหน้าที่"
                className="w-full rounded-lg border border-white/10 bg-navy-deeper px-3 py-2.5 text-white placeholder-white/40 outline-none focus:border-teal"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-white/70">หมายเหตุ</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="คำแนะนำเพิ่มเติมสำหรับคนไข้"
              className="w-full rounded-lg border border-white/10 bg-navy-deeper px-4 py-2.5 text-white placeholder-white/40 outline-none focus:border-teal"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !selected}
            className="w-full rounded-lg bg-teal px-4 py-3 font-medium text-white transition hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "กำลังส่ง..." : "บันทึกและส่งผลตรวจ"}
          </button>
          <p className="text-center text-xs text-white/40">
            ระบบจะส่งอีเมลแจ้งเตือนไปยังคนไข้โดยอัตโนมัติ
          </p>
        </form>
      </div>
    </main>
  );
}
