"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";
import { api, ApiError } from "@/lib/api";

type FamilyMember = {
  memberId: string;
  patientId: string;
  relationship: string;
  nickname: string | null;
  prefix_th: string | null;
  first_name_th: string | null;
  last_name_th: string | null;
  national_id: string | null;
  date_of_birth: string | null;
};

type SelfPatient = {
  patientId: string;
  prefix_th: string | null;
  first_name_th: string | null;
  last_name_th: string | null;
  national_id: string | null;
} | null;

const RELATIONSHIP_LABELS: Record<string, string> = {
  self: "ตัวเอง",
  child: "บุตร",
  parent: "บิดา/มารดา",
  spouse: "คู่สมรส",
  other: "อื่น ๆ",
};

const PREFIX_OPTIONS = ["นาย", "นาง", "นางสาว", "ด.ช.", "ด.ญ.", "อื่น ๆ"];

function displayName(m: { nickname?: string | null; prefix_th?: string | null; first_name_th?: string | null; last_name_th?: string | null }) {
  if (m.nickname) return m.nickname;
  const full = `${m.prefix_th || ""}${m.first_name_th || ""} ${m.last_name_th || ""}`.trim();
  return full || "ไม่ระบุชื่อ";
}

export default function FamilyPage() {
  const [self, setSelf] = useState<SelfPatient>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [showForm, setShowForm] = useState(false);
  const [prefixTh, setPrefixTh] = useState("นาย");
  const [firstNameTh, setFirstNameTh] = useState("");
  const [lastNameTh, setLastNameTh] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [relationship, setRelationship] = useState("child");
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState("");
  const [religion, setReligion] = useState("");
  const [drugFoodAllergies, setDrugFoodAllergies] = useState("");
  const [bloodType, setBloodType] = useState("unknown");
  const [congenitalDiseases, setCongenitalDiseases] = useState("");
  const [insuranceType, setInsuranceType] = useState("");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ self: SelfPatient; members: FamilyMember[] }>("/api/family/members");
      setSelf(res.self);
      setMembers(res.members || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setPrefixTh("นาย");
    setFirstNameTh("");
    setLastNameTh("");
    setNationalId("");
    setDateOfBirth("");
    setRelationship("child");
    setNickname("");
    setGender("");
    setReligion("");
    setDrugFoodAllergies("");
    setBloodType("unknown");
    setCongenitalDiseases("");
    setInsuranceType("");

    setFormError(null);
  }

  async function handleAdd() {
    if (!firstNameTh.trim() || !lastNameTh.trim()) {
      setFormError("กรุณากรอกชื่อและนามสกุล");
      return;
    }
    if (nationalId.trim() && !/^\d{13}$/.test(nationalId.trim())) {
      setFormError("เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/api/family/members", {
        prefixTh: prefixTh === "อื่น ๆ" ? "" : prefixTh,
        firstNameTh: firstNameTh.trim(),
        lastNameTh: lastNameTh.trim(),
        nationalId: nationalId.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        relationship,
        nickname: nickname.trim() || undefined,
        gender: gender || undefined,
        religion: religion.trim() || undefined,
        drugFoodAllergies: drugFoodAllergies.trim() || undefined,
        bloodType: bloodType || undefined,
        congenitalDiseases: congenitalDiseases.trim() || undefined,
        insuranceType: insuranceType || undefined,

      });
      resetForm();
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "เพิ่มบัญชีรองไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(memberId: string) {
    if (!confirm("ยืนยันการลบบัญชีรองนี้? (ข้อมูลการจองและผลตรวจของคนนี้จะถูกลบด้วย)")) return;
    try {
      await api.delete(`/api/family/members/${memberId}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <main className="relative min-h-screen pb-24">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat opacity-[0.15]"
        style={{ backgroundImage: "url('/bg.jpg')" }}
      />
      <div className="relative mx-auto max-w-md px-4 pt-6">
        <div className="mb-5 flex items-center justify-between">
          <HamburgerMenu />
          <div className="text-center">
            <h1 className="font-display text-xl font-semibold text-ink">บัญชีรองในครอบครัว</h1>
            <p className="text-sm text-ink/55">จองคิวให้บุคคลในครอบครัวได้ง่ายขึ้น</p>
          </div>
          <Link href="/app-home" className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink/60 hover:bg-teal-light hover:text-teal-dark transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
        )}

        {loading ? (
          <p className="text-sm text-ink/50">กำลังโหลด...</p>
        ) : (
          <>
            {/* Self card */}
            {self && (
              <section className="card mb-4 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink/40">บัญชีหลัก</p>
                    <p className="font-display text-base font-semibold text-ink">{displayName(self)}</p>
                    {self.national_id && (
                      <p className="text-sm text-ink/55">เลขบัตร: {self.national_id}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-teal-light px-3 py-1 text-xs font-medium text-teal-dark">
                    ตัวเอง
                  </span>
                </div>
              </section>
            )}

            {/* Members list */}
            <h2 className="mb-2 px-1 text-sm font-medium text-ink/70">บัญชีรอง ({members.length})</h2>
            {members.length === 0 ? (
              <div className="card mb-4 p-5 text-center text-sm text-ink/50">
                ยังไม่มีบัญชีรอง เพิ่มบุคคลในครอบครัวเพื่อจองคิวให้ได้
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((m) => (
                  <section key={m.memberId} className="card p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-display text-base font-semibold text-ink">{displayName(m)}</p>
                        <p className="text-sm text-ink/55">
                          {RELATIONSHIP_LABELS[m.relationship] || m.relationship}
                          {m.national_id ? ` · เลขบัตร ${m.national_id}` : ""}
                        </p>
                        {m.date_of_birth && (
                          <p className="text-xs text-ink/45">เกิด: {m.date_of_birth}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(m.memberId)}
                        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        ลบ
                      </button>
                    </div>
                  </section>
                ))}
              </div>
            )}

            {/* Add button */}
            {!showForm && (
              <button
                type="button"
                onClick={() => { resetForm(); setShowForm(true); }}
                className="btn-primary mt-4 w-full"
              >
                + เพิ่มบัญชีรอง
              </button>
            )}

            {/* Add form */}
            {showForm && (
              <section className="card mt-4 space-y-3 p-5">
                <h3 className="font-display text-base font-semibold text-ink">เพิ่มบัญชีรอง</h3>

                <div>
                  <label className="field-label">คำนำหน้า</label>
                  <select className="field-input" value={prefixTh} onChange={(e) => setPrefixTh(e.target.value)}>
                    {PREFIX_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-label">ชื่อ (ไทย) *</label>
                  <input className="field-input" value={firstNameTh} onChange={(e) => setFirstNameTh(e.target.value)} placeholder="เช่น สมชาย" />
                </div>

                <div>
                  <label className="field-label">นามสกุล (ไทย) *</label>
                  <input className="field-input" value={lastNameTh} onChange={(e) => setLastNameTh(e.target.value)} placeholder="เช่น ใจดี" />
                </div>

                <div>
                  <label className="field-label">ชื่อเล่น</label>
                  <input className="field-input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="แสดงแทนชื่อ (ไม่ระบุก็ได้)" />
                </div>

                <div>
                  <label className="field-label">เลขบัตรประชาชน</label>
                  <input className="field-input" value={nationalId} onChange={(e) => setNationalId(e.target.value.replace(/\D/g, "").slice(0, 13))} placeholder="13 หลัก (ไม่ระบุก็ได้)" inputMode="numeric" />
                </div>

                <div>
                  <label className="field-label">วันเกิด</label>
                  <input type="date" className="field-input" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                </div>

                <div>
                  <label className="field-label">ความสัมพันธ์</label>
                  <select className="field-input" value={relationship} onChange={(e) => setRelationship(e.target.value)}>
                    <option value="child">บุตร</option>
                    <option value="parent">บิดา/มารดา</option>
                    <option value="spouse">คู่สมรส</option>
                    <option value="other">อื่น ๆ</option>
                  </select>
                </div>

                {/* ── ซักประวัติ ── */}
                <div className="border-t border-line pt-3">
                  <p className="mb-2 text-sm font-medium text-ink">ข้อมูลสุขภาพ</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="field-label">เพศ</label>
                      <select className="field-input" value={gender} onChange={(e) => setGender(e.target.value)}>
                        <option value="">ไม่ระบุ</option>
                        <option value="male">ชาย</option>
                        <option value="female">หญิง</option>
                        <option value="other">อื่น ๆ</option>
                      </select>
                    </div>
                    <div>
                      <label className="field-label">กรุ๊ปเลือด</label>
                      <select className="field-input" value={bloodType} onChange={(e) => setBloodType(e.target.value)}>
                        <option value="unknown">ไม่ทราบ</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="AB">AB</option>
                        <option value="O">O</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="field-label">ศาสนา</label>
                    <input className="field-input" value={religion} onChange={(e) => setReligion(e.target.value)} placeholder="เช่น พุทธ" />
                  </div>

                  <div className="mt-3">
                    <label className="field-label">โรคประจำตัว</label>
                    <textarea className="field-input min-h-[60px]" value={congenitalDiseases} onChange={(e) => setCongenitalDiseases(e.target.value)} placeholder="เช่น ความดันโลหิตสูง, เบาหวาน (ถ้าไม่มีเว้นว่าง)" />
                  </div>

                  <div className="mt-3">
                    <label className="field-label">ประวัติแพ้ยา / แพ้อาหาร</label>
                    <textarea className="field-input min-h-[60px]" value={drugFoodAllergies} onChange={(e) => setDrugFoodAllergies(e.target.value)} placeholder="เช่น แพ้ยาเพนิซิลลิน (ถ้าไม่มีเว้นว่าง)" />
                  </div>

                  <div className="mt-3">
                    <label className="field-label">สิทธิการรักษาพยาบาล *</label>
                    <select className="field-input" value={insuranceType} onChange={(e) => setInsuranceType(e.target.value)}>
                      <option value="">กรุณาเลือก</option>
                      <option value="ucs">บัตรทอง (30 บาท)</option>
                      <option value="social_security">ประกันสังคม</option>
                      <option value="civil_servant">ข้าราชการ/รัฐวิสาหกิจ</option>
                      <option value="none">ไม่มีสิทธิ</option>
                      <option value="other">อื่น ๆ</option>
                    </select>
                  </div>
                </div>



                {formError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{formError}</div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" className="btn-secondary flex-1" onClick={() => { resetForm(); setShowForm(false); }} disabled={saving}>
                    ยกเลิก
                  </button>
                  <button type="button" className="btn-primary flex-1" onClick={handleAdd} disabled={saving}>
                    {saving ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>
              </section>
            )}

            <Link href="/booking" className="mt-4 block text-center text-sm text-teal-dark hover:underline">
              ไปจองคิวให้ครอบครัว →
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
