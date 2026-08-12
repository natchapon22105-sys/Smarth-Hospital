"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";

export default function NurseRegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/nurse-auth/register", { email, username, password, fullName, phone: phone || undefined });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ลงทะเบียนไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="relative flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center mx-auto rounded-full bg-teal-light text-teal-dark">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink">ลงทะเบียนสำเร็จ</h1>
          <p className="mt-2 text-sm text-ink/60">รอผู้ดูแลระบบอนุมัติก่อนเข้าใช้งาน</p>
          <Link href="/nurse/login" className="btn-primary mt-6 inline-flex w-full">
            ไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat opacity-[0.08]"
        style={{ backgroundImage: 'url("/usebackground.png")' }} />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-teal/20 shadow-lg">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0E7C7B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink">ลงทะเบียนพยาบาล</h1>
          <p className="mt-1 text-sm text-ink/60">กรอกข้อมูลเพื่อขออนุมัติเข้าใช้งาน</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="field-label" htmlFor="fullName">ชื่อ-นามสกุล</label>
            <input id="fullName" className="field-input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="field-label" htmlFor="email">อีเมล</label>
            <input id="email" type="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="field-label" htmlFor="username">ชื่อผู้ใช้ (Username)</label>
            <input id="username" className="field-input" value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, ""))} required />
            <p className="mt-1 text-xs text-ink/45">เฉพาะภาษาอังกฤษ ตัวเลข . และ _</p>
          </div>
          <div>
            <label className="field-label" htmlFor="phone">เบอร์โทรศัพท์ (ถ้ามี)</label>
            <input id="phone" className="field-input" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div>
            <label className="field-label" htmlFor="password">รหัสผ่าน</label>
            <input id="password" type="password" className="field-input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </div>
          <div>
            <label className="field-label" htmlFor="confirmPassword">ยืนยันรหัสผ่าน</label>
            <input id="confirmPassword" type="password" className="field-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
          </div>
          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "กำลังส่ง..." : "ส่งคำขอลงทะเบียน"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink/60">
          มีบัญชีอยู่แล้ว?{" "}
          <Link href="/nurse/login" className="font-medium text-teal hover:underline">เข้าสู่ระบบ</Link>
        </p>
      </div>
    </main>
  );
}
