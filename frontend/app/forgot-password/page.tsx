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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [guideStep, setGuideStep] = useState(0);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email });
      setStep("otp");
      setGuideStep(0);
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
    setGuideStep(0);
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
              {/* Guide: email field */}
              <div className={`rounded-lg border-2 transition-all duration-300 p-4 mb-5 ${guideStep === 0 ? 'border-teal bg-teal/[0.03] shadow-[0_0_0_3px_rgba(14,124,123,0.12)]' : 'border-transparent'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="field-label" htmlFor="email">อีเมล</label>
                    <input id="email" type="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>
                {guideStep === 0 && (
                  <div className="mt-3 rounded-lg bg-teal px-3.5 py-2.5">
                    <p className="text-xs text-white leading-relaxed">
                      <span className="font-semibold">ขั้นตอนที่ 1 — </span>
                      กรอกอีเมลที่ใช้สมัครสมาชิกไว้ เพื่อรับรหัส OTP สำหรับรีเซ็ตรหัสผ่าน
                    </p>
                    <button
                      type="button"
                      onClick={() => setGuideStep(1)}
                      className="mt-2 rounded-md bg-white/20 px-3 py-1 text-xs font-medium text-white hover:bg-white/30 transition"
                    >
                      ถัดไป
                    </button>
                  </div>
                )}
              </div>
              {error && <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
              <div className={`transition-all duration-300 ${guideStep === 1 ? '' : 'opacity-40 pointer-events-none'}`}>
                {guideStep === 1 && (
                  <div className="mb-3 rounded-lg bg-teal px-3.5 py-2.5">
                    <p className="text-xs text-white leading-relaxed">
                      <span className="font-semibold">ขั้นตอนที่ 2 — </span>
                      กดปุ่มดานล่างเพื่อส่งรหัส OTP ไปยังอีเมลของคุณ
                    </p>
                  </div>
                )}
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? "กำลังส่ง..." : "ส่งรหัส OTP"}
                </button>
              </div>
              <p className="mt-4 text-center text-sm text-ink/60">
                <Link href="/login" className="text-teal hover:underline">กลับไปหน้าเข้าสู่ระบบ</Link>
              </p>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp}>
              {/* Guide: OTP field */}
              <div className={`rounded-lg border-2 transition-all duration-300 p-4 mb-5 ${guideStep === 0 ? 'border-teal bg-teal/[0.03] shadow-[0_0_0_3px_rgba(14,124,123,0.12)]' : 'border-transparent'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="field-label" htmlFor="code">รหัส OTP (6 หลัก)</label>
                    <input id="code" inputMode="numeric" maxLength={6} className="field-input font-mono tracking-[0.4em] text-center text-lg" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required />
                  </div>
                </div>
                {guideStep === 0 && (
                  <div className="mt-3 rounded-lg bg-teal px-3.5 py-2.5">
                    <p className="text-xs text-white leading-relaxed">
                      <span className="font-semibold">ขั้นตอนที่ 1 — </span>
                      ตรวจสอบรหัส OTP 6 หลักที่ส่งไปยังอีเมล {email} แล้วกรอกลงในช่องด้านบน
                    </p>
                    <button
                      type="button"
                      onClick={() => setGuideStep(1)}
                      className="mt-2 rounded-md bg-white/20 px-3 py-1 text-xs font-medium text-white hover:bg-white/30 transition"
                    >
                      ถัดไป
                    </button>
                  </div>
                )}
              </div>
              {error && <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
              <div className={`transition-all duration-300 ${guideStep === 1 ? '' : 'opacity-40 pointer-events-none'}`}>
                {guideStep === 1 && (
                  <div className="mb-3 rounded-lg bg-teal px-3.5 py-2.5">
                    <p className="text-xs text-white leading-relaxed">
                      <span className="font-semibold">ขั้นตอนที่ 2 — </span>
                      กดยืนยันเพื่อตรวจสอบ OTP และไปยังขั้นตอนตั้งรหัสผ่านใหม่
                    </p>
                  </div>
                )}
                <button type="submit" className="btn-primary w-full" disabled={loading || code.length !== 6}>
                  {loading ? "กำลังตรวจสอบ..." : "ยืนยันและตั้งรหัสผ่านใหม่"}
                </button>
                <button type="button" onClick={() => { setStep("email"); setGuideStep(0); }} className="mt-3 w-full text-center text-sm text-ink/60 hover:underline">
                  แก้ไขอีเมล
                </button>
              </div>
            </form>
          )}

          {step === "newPassword" && (
            <form onSubmit={handleReset}>
              {/* Guide: new password field */}
              <div className={`rounded-lg border-2 transition-all duration-300 p-4 mb-4 ${guideStep === 0 ? 'border-teal bg-teal/[0.03] shadow-[0_0_0_3px_rgba(14,124,123,0.12)]' : guideStep > 0 ? 'border-transparent' : 'border-transparent opacity-40 pointer-events-none'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="field-label" htmlFor="newPassword">รหัสผ่านใหม่</label>
                    <div className="relative">
                      <input id="newPassword" type={showPassword ? "text" : "password"} className="field-input pr-10" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
                    </div>
                  </div>
                </div>
                {guideStep === 0 && (
                  <div className="mt-3 rounded-lg bg-teal px-3.5 py-2.5">
                    <p className="text-xs text-white leading-relaxed">
                      <span className="font-semibold">ขั้นตอนที่ 1 — </span>
                      ตั้งรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร กดปุ่มรูปตาค้างไว้เพื่อดูรหัสผ่านขณะพิมพ์
                    </p>
                    <button
                      type="button"
                      onClick={() => setGuideStep(1)}
                      className="mt-2 rounded-md bg-white/20 px-3 py-1 text-xs font-medium text-white hover:bg-white/30 transition"
                    >
                      ถัดไป
                    </button>
                  </div>
                )}
              </div>

              {/* Guide: confirm password field */}
              <div className={`rounded-lg border-2 transition-all duration-300 p-4 mb-5 ${guideStep === 1 ? 'border-teal bg-teal/[0.03] shadow-[0_0_0_3px_rgba(14,124,123,0.12)]' : guideStep > 1 ? 'border-transparent' : 'border-transparent opacity-40 pointer-events-none'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="field-label" htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</label>
                    <div className="relative">
                      <input id="confirmPassword" type={showPassword ? "text" : "password"} className="field-input pr-10" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
                      <button
                        type="button"
                        onMouseDown={() => setShowPassword(true)}
                        onMouseUp={() => setShowPassword(false)}
                        onMouseLeave={() => setShowPassword(false)}
                        onTouchStart={() => setShowPassword(true)}
                        onTouchEnd={() => setShowPassword(false)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70"
                        tabIndex={-1}
                        aria-label="แสดงรหัสผ่าน"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                {guideStep === 1 && (
                  <div className="mt-3 rounded-lg bg-teal px-3.5 py-2.5">
                    <p className="text-xs text-white leading-relaxed">
                      <span className="font-semibold">ขั้นตอนที่ 2 — </span>
                      กรอกรหัสผ่านอีกครั้งเพื่อยืนยันว่ารหัสผ่านถูกต้อง
                    </p>
                    <button
                      type="button"
                      onClick={() => setGuideStep(2)}
                      className="mt-2 rounded-md bg-white/20 px-3 py-1 text-xs font-medium text-white hover:bg-white/30 transition"
                    >
                      ถัดไป
                    </button>
                  </div>
                )}
              </div>

              {error && <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

              {/* Guide: submit button */}
              <div className={`transition-all duration-300 ${guideStep === 2 ? '' : 'opacity-40 pointer-events-none'}`}>
                {guideStep === 2 && (
                  <div className="mb-3 rounded-lg bg-teal px-3.5 py-2.5">
                    <p className="text-xs text-white leading-relaxed">
                      <span className="font-semibold">ขั้นตอนที่ 3 — </span>
                      ตั้งรหัสผ่านเสร็จแล้ว กดปุ่มดานล่างเพื่อบันทึกรหัสผ่านใหม่
                    </p>
                  </div>
                )}
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? "กำลังบันทึก..." : "รีเซ็ตรหัสผ่าน"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}