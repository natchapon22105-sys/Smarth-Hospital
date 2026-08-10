"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";

type Step = "email" | "otp" | "newPassword";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email });
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ส่ง OTP ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
    setStep("newPassword");
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { email, code, newPassword });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError && err.payload?.reason) {
        setError(err.payload.reason === "incorrect_code" ? "รหัส OTP ไม่ถูกต้อง" : err.payload.reason);
      } else {
        setError(err instanceof ApiError ? err.message : "รีเซ็ตรหัสผ่านไม่สำเร็จ");
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-teal/20 shadow-lg">
            <Image src="/logo.png" alt="NudMedi" width={96} height={96} className="h-full w-full object-cover" priority />
          </div>
          <h1 className="gradient-text font-display text-3xl font-bold tracking-widest">NUDMEDI</h1>
          <div className="card mt-6 p-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-light text-teal-dark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h2 className="font-display text-lg font-semibold text-ink">รีเซ็ตรหัสผ่านสำเร็จ</h2>
            <p className="mt-2 text-sm text-ink/60">กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่</p>
            <Link href="/login" className="btn-primary mt-5 inline-flex w-full">
              ไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat opacity-[0.08]"
        style={{ backgroundImage: 'url("/usebackground.png")' }}
      />
      <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ transformStyle: "preserve-3d" }}>
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-teal/10 animate-[float-1_8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-teal/10 animate-[float-2_10s_ease-in-out_infinite]" />
        <div className="absolute left-1/4 top-1/3 h-20 w-20 rounded-full bg-teal/10 animate-[float-3_7s_ease-in-out_infinite]" />
        <div className="absolute right-1/3 top-1/4 h-24 w-24 rounded-full bg-teal/10 animate-[float-3_11s_ease-in-out_infinite_3s]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-teal/20 shadow-lg animate-[logo-float-3d_6s_ease-in-out_infinite]">
            <Image src="/logo.png" alt="NudMedi" width={96} height={96} className="h-full w-full object-cover" priority />
          </div>
          <h1 className="gradient-text font-display text-3xl font-bold tracking-widest">NUDMEDI</h1>
          <p className="mt-1 text-sm text-ink/60">
            {step === "email" && "กรอกอีเมลเพื่อรับรหัสยืนยัน"}
            {step === "otp" && `กรอกรหัส OTP ที่ส่งไปที่ ${email}`}
            {step === "newPassword" && "ตั้งรหัสผ่านใหม่"}
          </p>
        </div>

        <div className="card p-6 animate-[card-float_4s_ease-in-out_infinite]">
          {step === "email" && (
            <form onSubmit={handleSendOtp}>
              <div className="mb-5">
                <label className="field-label" htmlFor="email">อีเมล</label>
                <input id="email" type="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              {error && <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? "กำลังส่ง..." : "ส่งรหัส OTP"}
              </button>
              <p className="mt-4 text-center text-sm text-ink/60">
                <Link href="/login" className="text-teal hover:underline">กลับไปหน้าเข้าสู่ระบบ</Link>
              </p>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp}>
              <div className="mb-5">
                <label className="field-label" htmlFor="code">รหัส OTP (6 หลัก)</label>
                <input id="code" inputMode="numeric" maxLength={6} className="field-input font-mono tracking-[0.4em] text-center text-lg" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required />
              </div>
              {error && <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading || code.length !== 6}>
                {loading ? "กำลังตรวจสอบ..." : "ยืนยันและตั้งรหัสผ่านใหม่"}
              </button>
              <button type="button" onClick={() => setStep("email")} className="mt-3 w-full text-center text-sm text-ink/60 hover:underline">
                แก้ไขอีเมล
              </button>
            </form>
          )}

          {step === "newPassword" && (
            <form onSubmit={handleReset}>
              <div className="mb-4">
                <label className="field-label" htmlFor="newPassword">รหัสผ่านใหม่</label>
                <input id="newPassword" type="password" className="field-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
              </div>
              <div className="mb-5">
                <label className="field-label" htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</label>
                <input id="confirmPassword" type="password" className="field-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
              </div>
              {error && <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? "กำลังบันทึก..." : "รีเซ็ตรหัสผ่าน"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}