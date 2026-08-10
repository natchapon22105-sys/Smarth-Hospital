"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";
import { api, ApiError } from "@/lib/api";

type Patient = {
  national_id: string | null;
  prefix_th: string | null;
  first_name_th: string | null;
  last_name_th: string | null;
  prefix_en: string | null;
  first_name_en: string | null;
  last_name_en: string | null;
  address: string | null;
  date_of_birth: string | null;
  gender: string | null;
  religion: string | null;
  drug_food_allergies: string | null;
  blood_type: string | null;
  congenital_diseases: string | null;
  insurance_type: string | null;
  pdpa_consent: number;
};

type EmergencyContact = { full_name: string; relationship: string; phone: string } | null;

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 font-display text-[15px] font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

// Format helpers
function formatNationalId(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  const parts = [
    digits.slice(0, 1),
    digits.slice(1, 5),
    digits.slice(5, 10),
    digits.slice(10, 12),
    digits.slice(12, 13),
  ].filter(Boolean);
  return parts.join("-");
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

const PREFIX_OPTIONS = [
  { value: "นาย", label: "นาย" },
  { value: "นาง", label: "นาง" },
  { value: "นางสาว", label: "นางสาว" },
  { value: "ด.ช.", label: "ด.ช." },
  { value: "ด.ญ.", label: "ด.ญ." },
  { value: "พระ", label: "พระ" },
  { value: "other", label: "อื่น ๆ" },
];

const PREFIX_EN_OPTIONS = [
  { value: "Mr.", label: "Mr." },
  { value: "Mrs.", label: "Mrs." },
  { value: "Ms.", label: "Ms." },
  { value: "other", label: "Other" },
];

export default function PatientProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Combined form state
  const [form, setForm] = useState({
    nationalId: "",
    prefixTh: "",
    firstNameTh: "",
    lastNameTh: "",
    prefixEn: "",
    firstNameEn: "",
    lastNameEn: "",
    address: "",
    dateOfBirth: "",
    gender: "",
    religion: "",
    drugFoodAllergies: "",
    bloodType: "unknown",
    congenitalDiseases: "",
    insuranceType: "",
    emergencyFullName: "",
    emergencyRelationship: "",
    emergencyPhone: "",
    pdpaConsent: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ patient: Patient; emergencyContact: EmergencyContact }>(
          "/api/patient/profile"
        );
        const p = res.patient;
        setForm((prev) => ({
          ...prev,
          nationalId: p.national_id || "",
          prefixTh: p.prefix_th || "",
          firstNameTh: p.first_name_th || "",
          lastNameTh: p.last_name_th || "",
          prefixEn: p.prefix_en || "",
          firstNameEn: p.first_name_en || "",
          lastNameEn: p.last_name_en || "",
          address: p.address || "",
          dateOfBirth: p.date_of_birth || "",
          gender: p.gender || "",
          religion: p.religion || "",
          drugFoodAllergies: p.drug_food_allergies || "",
          bloodType: p.blood_type || "unknown",
          congenitalDiseases: p.congenital_diseases || "",
          insuranceType: p.insurance_type || "",
          pdpaConsent: !!p.pdpa_consent,
        }));
        if (res.emergencyContact) {
          setForm((prev) => ({
            ...prev,
            emergencyFullName: res.emergencyContact!.full_name,
            emergencyRelationship: res.emergencyContact!.relationship,
            emergencyPhone: res.emergencyContact!.phone,
          }));
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, []);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleOcrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    setOcrLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await api.upload<{ fields: Record<string, string> }>("/api/ocr/id-card", formData);
      // Merge OCR fields into form
      setForm((prev) => ({ ...prev, ...res.fields }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "อ่านข้อมูลจากบัตรไม่สำเร็จ กรอกเองแทนได้");
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSaveAll(e: React.FormEvent) {
    e.preventDefault();
    if (!form.insuranceType) {
      setError("กรุณาเลือกสิทธิการรักษาพยาบาล");
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await api.put("/api/patient/save-all", {
        ...form,
        nationalId: form.nationalId.replace(/[^0-9]/g, ""),
        emergencyPhone: form.emergencyPhone.replace(/[^0-9]/g, ""),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  if (loadingProfile) {
    return (
      <main className="min-h-screen">
        <header className="flex items-center gap-3 px-5 py-4">
          <HamburgerMenu />
          <Link href="/app-home" className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink transition hover:bg-teal-light hover:text-teal-dark" aria-label="กลับหน้าเลือกบริการ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12l9-9 9 9" />
              <path d="M5 10v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1v-9" />
            </svg>
          </Link>
          <span className="font-display text-base font-semibold">ข้อมูลส่วนตัว</span>
        </header>
        <p className="px-5 text-sm text-ink/60">กำลังโหลด...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-16">
      <header className="flex items-center gap-3 px-5 py-4">
        <HamburgerMenu />
        <Link href="/app-home" className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink transition hover:bg-teal-light hover:text-teal-dark" aria-label="กลับหน้าเลือกบริการ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12l9-9 9 9" />
            <path d="M5 10v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1v-9" />
          </svg>
        </Link>
        <span className="font-display text-base font-semibold">ข้อมูลส่วนตัว & ประวัติสุขภาพ</span>
      </header>

      <form onSubmit={handleSaveAll}>
        <div className="mx-auto max-w-lg space-y-5 px-5">
          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          {/* --- Section 1: ID card / bio data --- */}
          <SectionCard title="1. ข้อมูลบัตรประชาชน">
            <div className="mb-4 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleOcrUpload}
              />
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={ocrLoading}
              >
                {ocrLoading ? "กำลังอ่านข้อมูลจากบัตร..." : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                    ถ่ายรูป / อัปโหลดบัตรประชาชนเพื่อกรอกอัตโนมัติ
                  </>
                )}
              </button>

              {/* Image preview */}
              {previewUrl && (
                <div className="overflow-hidden rounded-xl border border-line">
                  <img
                    src={previewUrl}
                    alt="รูปบัตรประชาชน"
                    className="w-full object-contain"
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="field-label">เลขบัตรประชาชน</label>
                <input
                  className="field-input font-mono"
                  inputMode="numeric"
                  maxLength={17}
                  value={form.nationalId}
                  onChange={(e) => update("nationalId", formatNationalId(e.target.value))}
                />
              </div>

              {/* คำนำหน้า (TH) — dropdown */}
              <div>
                <label className="field-label">คำนำหน้า (TH)</label>
                <select
                  className="field-input"
                  value={form.prefixTh}
                  onChange={(e) => update("prefixTh", e.target.value)}
                >
                  <option value="">เลือก</option>
                  {PREFIX_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {form.prefixTh === "other" && (
                  <input
                    className="field-input mt-2"
                    placeholder="ระบุคำนำหน้า"
                    value={form.prefixTh === "other" ? "" : form.prefixTh}
                    onChange={(e) => update("prefixTh", e.target.value)}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">ชื่อ (TH)</label>
                  <input
                    className="field-input"
                    value={form.firstNameTh}
                    onChange={(e) => update("firstNameTh", e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">นามสกุล (TH)</label>
                  <input
                    className="field-input"
                    value={form.lastNameTh}
                    onChange={(e) => update("lastNameTh", e.target.value)}
                  />
                </div>
              </div>

              {/* Prefix (EN) — dropdown */}
              <div>
                <label className="field-label">Prefix (EN)</label>
                <select
                  className="field-input"
                  value={form.prefixEn}
                  onChange={(e) => update("prefixEn", e.target.value)}
                >
                  <option value="">Select</option>
                  {PREFIX_EN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {form.prefixEn === "other" && (
                  <input
                    className="field-input mt-2"
                    placeholder="Specify prefix"
                    onChange={(e) => update("prefixEn", e.target.value)}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">First name (EN)</label>
                  <input
                    className="field-input"
                    value={form.firstNameEn}
                    onChange={(e) => update("firstNameEn", e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">Last name (EN)</label>
                  <input
                    className="field-input"
                    value={form.lastNameEn}
                    onChange={(e) => update("lastNameEn", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="field-label">ที่อยู่ปัจจุบัน</label>
                <textarea
                  className="field-input min-h-[72px]"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">วัน/เดือน/ปีเกิด</label>
                  <input
                    type="date"
                    className="field-input"
                    value={form.dateOfBirth}
                    onChange={(e) => update("dateOfBirth", e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">เพศ</label>
                  <select
                    className="field-input"
                    value={form.gender}
                    onChange={(e) => update("gender", e.target.value)}
                  >
                    <option value="">เลือก</option>
                    <option value="male">ชาย</option>
                    <option value="female">หญิง</option>
                    <option value="other">อื่น ๆ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="field-label">ศาสนา</label>
                <input
                  className="field-input"
                  value={form.religion}
                  onChange={(e) => update("religion", e.target.value)}
                />
              </div>
            </div>
          </SectionCard>

          {/* --- Section 2: medical history --- */}
          <SectionCard title="2. ข้อมูลประวัติสุขภาพ">
            <div className="space-y-4">
              <div>
                <label className="field-label">ประวัติการแพ้ยา / อาหาร (ถ้ามี)</label>
                <textarea
                  className="field-input min-h-[64px]"
                  placeholder="เช่น แพ้เพนิซิลลิน, แพ้กุ้ง"
                  value={form.drugFoodAllergies}
                  onChange={(e) => update("drugFoodAllergies", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">หมู่เลือด (ถ้าทราบ)</label>
                <select
                  className="field-input"
                  value={form.bloodType}
                  onChange={(e) => update("bloodType", e.target.value)}
                >
                  <option value="unknown">ไม่ทราบ</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                </select>
              </div>
              <div>
                <label className="field-label">โรคประจำตัว</label>
                <textarea
                  className="field-input min-h-[64px]"
                  placeholder="เช่น เบาหวาน, ความดันโลหิตสูง"
                  value={form.congenitalDiseases}
                  onChange={(e) => update("congenitalDiseases", e.target.value)}
                />
              </div>
            </div>
          </SectionCard>

          {/* --- Section 3: emergency contact --- */}
          <SectionCard title="3. ผู้ติดต่อยามฉุกเฉิน">
            <div className="space-y-4">
              <div>
                <label className="field-label">ชื่อ-นามสกุล ของญาติ</label>
                <input
                  className="field-input"
                  value={form.emergencyFullName}
                  onChange={(e) => update("emergencyFullName", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">ความสัมพันธ์</label>
                <input
                  className="field-input"
                  placeholder="เช่น บิดา, มารดา, คู่สมรส"
                  value={form.emergencyRelationship}
                  onChange={(e) => update("emergencyRelationship", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">เบอร์โทรศัพท์ติดต่อ</label>
                <input
                  className="field-input"
                  inputMode="numeric"
                  maxLength={12}
                  value={form.emergencyPhone}
                  onChange={(e) => update("emergencyPhone", formatPhone(e.target.value))}
                />
              </div>
            </div>
          </SectionCard>

          {/* --- Section 4: Insurance --- */}
          <SectionCard title="สิทธิการรักษาพยาบาล">
            <div className="space-y-3">
              {[
                { value: "ucs", label: "สิทธิหลักประกันสุขภาพแห่งชาติ (บัตรทอง / 30 บาท)" },
                { value: "social_security", label: "สิทธิประกันสังคม" },
                { value: "civil_servant", label: "สวัสดิการรักษาพยาบาลข้าราชการ" },
                { value: "none", label: "ไม่มีสิทธิการรักษา" },
                { value: "other", label: "อื่น ๆ" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3.5 py-3 text-sm has-[:checked]:border-teal has-[:checked]:bg-teal-light"
                >
                  <input
                    type="radio"
                    name="insurance"
                    value={opt.value}
                    checked={form.insuranceType === opt.value}
                    onChange={(e) => update("insuranceType", e.target.value)}
                    className="h-4 w-4"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </SectionCard>

          {/* --- PDPA consent (LAST) --- */}
          <SectionCard title="ความยินยอมด้านข้อมูลส่วนบุคคล (PDPA)">
            <label className="flex items-start gap-3 text-sm text-ink/80">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-line"
                checked={form.pdpaConsent}
                onChange={(e) => update("pdpaConsent", e.target.checked)}
              />
              <span>
                ข้าพเจ้ายินยอมให้ NudMedi เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลและข้อมูลสุขภาพของข้าพเจ้า
                เพื่อวัตถุประสงค์ในการนัดหมายและรับบริการทางการแพทย์ ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
              </span>
            </label>
            {form.pdpaConsent && <p className="mt-2 text-xs text-teal-dark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1"><polyline points="20 6 9 17 4 12" /></svg>ให้ความยินยอมแล้ว</p>}
          </SectionCard>

          {/* --- Single Save Button --- */}
          <button
            type="submit"
            className="btn-primary w-full text-base"
            disabled={saving}
          >
            {saving ? "กำลังบันทึก..." : saved ? "บันทึกแล้ว" : "บันทึกข้อมูลทั้งหมด"}
          </button>
        </div>
      </form>

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
