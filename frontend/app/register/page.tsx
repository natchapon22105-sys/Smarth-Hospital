"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";

type Step = "contact" | "otp" | "credentials";

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("contact");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [guideStep, setGuideStep] = useState(0);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/register/request-otp", { email, phone });
      setStep("otp");
      setGuideStep(0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ส่ง OTP ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ ok: true; otpToken: string }>("/api/auth/register/verify-otp", {
        phone,
        code: otp,
      });
      setOtpToken(res.otpToken);
      setStep("credentials");
      setGuideStep(0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "รหัส OTP ไม่ถูกต้อง");
    } finally {
      setLoading(false);
    }
  }

  async function completeRegistration(e: React.FormEvent) {
    e.preventDefault();
    if (!otpToken) return;
    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/register", { email, phone, otpToken, username, password });
      router.push("/patient/profile?first=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "สมัครสมาชิกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10" style={{ perspective: "1200px" }}>
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat opacity-[0.08]"
        style={{ backgroundImage: 'url("/usebackground.png")' }}
      />

      {/* Animated floating decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ transformStyle: "preserve-3d" }}>
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-teal/10 animate-[float-1_8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-teal/10 animate-[float-2_10s_ease-in-out_infinite]" />
        <div className="absolute left-1/4 top-1/3 h-20 w-20 rounded-full bg-teal/10 animate-[float-3_7s_ease-in-out_infinite]" />
        <div className="absolute bottom-1/4 right-1/4 h-16 w-16 rounded-full bg-teal/10 animate-[float-1_9s_ease-in-out_infinite_2s]" />
        <div className="absolute left-1/3 top-2/3 h-12 w-12 rounded-full bg-teal/10 animate-[float-2_6s_ease-in-out_infinite_1s]" />
        <div className="absolute right-1/3 top-1/4 h-24 w-24 rounded-full bg-teal/10 animate-[float-3_11s_ease-in-out_infinite_3s]" />
        <div className="absolute left-[15%] top-[15%] text-4xl text-teal/20 animate-[spin-plus_12s_linear_infinite]" style={{ transformStyle: "preserve-3d" }}>+</div>
        <div className="absolute right-[20%] bottom-[20%] text-3xl text-teal/20 animate-[spin-plus_15s_linear_infinite_2s]" style={{ transformStyle: "preserve-3d" }}>+</div>
        <div className="absolute left-[40%] bottom-[10%] text-2xl text-teal/20 animate-[spin-plus_10s_linear_infinite_4s]" style={{ transformStyle: "preserve-3d" }}>+</div>
      </div>

      <div className="relative z-10 w-full max-w-sm" style={{ perspective: "800px" }}>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-teal/20 shadow-lg animate-[logo-float-3d_6s_ease-in-out_infinite]">
            <Image src="/logo.png" alt="NudMedi" width={96} height={96} className="h-full w-full object-cover" priority />
          </div>
          <h1 className="gradient-text font-display text-3xl font-bold tracking-widest">NUDMEDI</h1>
          <h2 className="font-display text-xl font-semibold text-ink mt-4">สมัครสมาชิก</h2>
          <p className="mt-1 text-sm text-ink/60">
            {step === "contact" && "กรอกอีเมลและเบอร์โทรเพื่อรับรหัสยืนยัน"}
            {step === "otp" && `กรอกรหัส OTP ที่ส่งไปที่ ${email}`}
            {step === "credentials" && "ตั้งชื่อผู้ใช้และรหัสผ่าน"}
          </p>

          {/* Step indicator */}
          <div className="mt-6 flex items-center justify-center gap-1">
            {[
              { key: "contact", label: "ยืนยันตัวตน" },
              { key: "otp", label: "รหัส OTP" },
              { key: "credentials", label: "ตั้งรหัสผ่าน" },
            ].map((s, i) => {
              const steps: Step[] = ["contact", "otp", "credentials"];
              const currentIdx = steps.indexOf(step);
              const idx = steps.indexOf(s.key as Step);
              const done = idx < currentIdx;
              const active = idx === currentIdx;
              return (
                <div key={s.key} className="flex items-center">
                  {i > 0 && (
                    <div className={`mx-1 h-0.5 w-6 sm:w-10 ${done || active ? "bg-teal" : "bg-ink/15"}`} />
                  )}
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                        done
                          ? "bg-teal text-white"
                          : active
                          ? "border-2 border-teal bg-teal/10 text-teal"
                          : "border-2 border-ink/15 bg-white text-ink/30"
                      }`}
                    >
                      {done ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className={`text-[10px] leading-tight ${active ? "font-semibold text-teal" : done ? "text-teal" : "text-ink/30"}`}>
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-6 animate-[card-float_4s_ease-in-out_infinite]">
          {step === "contact" && (
            <form onSubmit={requestOtp}>
              {/* Guide: email field */}
              <div className={`rounded-lg border-2 transition-all duration-300 p-4 mb-4 ${guideStep === 0 ? 'border-teal bg-teal/[0.03] shadow-[0_0_0_3px_rgba(14,124,123,0.12)]' : guideStep > 0 ? 'border-transparent' : 'border-transparent'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="field-label" htmlFor="email">
                      อีเมล
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="field-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                {guideStep === 0 && (
                  <div className="mt-3 rounded-lg bg-teal px-3.5 py-2.5">
                    <p className="text-xs text-white leading-relaxed">
                      <span className="font-semibold">ขั้นตอนที่ 1 — </span>
                      กรอกอีเมลที่ใช้ติดต่อได้จริง เพื่อใช้ในการยืนยันตัวตนและรับข้อมูลสำคัญ
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

              {/* Guide: phone field */}
              <div className={`rounded-lg border-2 transition-all duration-300 p-4 mb-5 ${guideStep === 1 ? 'border-teal bg-teal/[0.03] shadow-[0_0_0_3px_rgba(14,124,123,0.12)]' : guideStep > 1 ? 'border-transparent' : guideStep < 1 ? 'border-transparent opacity-40 pointer-events-none' : 'border-transparent'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="field-label" htmlFor="phone">
                      เบอร์โทรศัพท์
                    </label>
                    <input
                      id="phone"
                      inputMode="numeric"
                      placeholder="0812345678"
                      className="field-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
                {guideStep === 1 && (
                  <div className="mt-3 rounded-lg bg-teal px-3.5 py-2.5">
                    <p className="text-xs text-white leading-relaxed">
                      <span className="font-semibold">ขั้นตอนที่ 2 — </span>
                      กรอกเบอร์โทรศัพท์มือถือที่ใช้จริง เผื่อในกรณีที่ต้องการติดต่อกลับ
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
              <div className={`transition-all duration-300 ${guideStep === 2 ? '' : guideStep < 2 ? 'opacity-40 pointer-events-none' : ''}`}>
                {guideStep === 2 && (
                  <div className="mb-3 rounded-lg bg-teal px-3.5 py-2.5">
                    <p className="text-xs text-white leading-relaxed">
                      <span className="font-semibold">ขั้นตอนที่ 3 — </span>
                      เมื่อกรอกข้อมูลครบแล้ว กดปุ่มดานล่างเพื่อส่งรหัส OTP ไปยังอีเมลของคุณ
                    </p>
                  </div>
                )}
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? "กำลังส่งรหัส..." : "ส่งรหัส OTP"}
                </button>
              </div>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={verifyOtp}>
              {/* Guide: OTP field */}
              <div className={`rounded-lg border-2 transition-all duration-300 p-4 mb-5 ${guideStep === 0 ? 'border-teal bg-teal/[0.03] shadow-[0_0_0_3px_rgba(14,124,123,0.12)]' : 'border-transparent'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="field-label" htmlFor="otp">
                      รหัส OTP (6 หลัก)
                    </label>
                    <input
                      id="otp"
                      inputMode="numeric"
                      maxLength={6}
                      className="field-input font-mono tracking-[0.4em] text-center text-lg"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      required
                    />
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

              {/* Guide: submit button */}
              <div className={`transition-all duration-300 ${guideStep === 1 ? '' : 'opacity-40 pointer-events-none'}`}>
                {guideStep === 1 && (
                  <div className="mb-3 rounded-lg bg-teal px-3.5 py-2.5">
                    <p className="text-xs text-white leading-relaxed">
                      <span className="font-semibold">ขั้นตอนที่ 2 — </span>
                      กดยืนยันรหัสเพื่อตรวจสอบ OTP และไปยังขั้นตอนตั้งรหัสผ่าน
                    </p>
                  </div>
                )}
                <button type="submit" className="btn-primary w-full" disabled={loading || otp.length !== 6}>
                  {loading ? "กำลังตรวจสอบ..." : "ยืนยันรหัส"}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep("contact"); setGuideStep(0); }}
                  className="mt-3 w-full text-center text-sm text-ink/60 hover:underline"
                >
                  แก้ไขอีเมล/เบอร์โทร
                </button>
              </div>
            </form>
          )}

          {step === "credentials" && (
            <form onSubmit={completeRegistration}>
              {/* Guide: username field */}
              <div className={`rounded-lg border-2 transition-all duration-300 p-4 mb-4 ${guideStep === 0 ? 'border-teal bg-teal/[0.03] shadow-[0_0_0_3px_rgba(14,124,123,0.12)]' : guideStep > 0 ? 'border-transparent' : 'border-transparent opacity-40 pointer-events-none'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="field-label" htmlFor="username">
                      ชื่อผู้ใช้ (Username)
                    </label>
                    <input
                      id="username"
                      className="field-input"
                      placeholder="เฉพาะภาษาอังกฤษ ตัวเลข . และ _"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, ""))}
                      required
                    />
                    <p className="mt-1.5 text-xs text-ink/45">ใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข . และ _</p>
                  </div>
                </div>
                {guideStep === 0 && (
                  <div className="mt-3 rounded-lg bg-teal px-3.5 py-2.5">
                    <p className="text-xs text-white leading-relaxed">
                      <span className="font-semibold">ขั้นตอนที่ 1 — </span>
                      ตั้งชื่อผู้ใช้สำหรับเข้าใช้งาน ใช้ตัวอักษรภาษาอังกฤษ ตัวเลข . และ _ เท่านั้น
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

              {/* Guide: password field */}
              <div className={`rounded-lg border-2 transition-all duration-300 p-4 mb-4 ${guideStep === 1 ? 'border-teal bg-teal/[0.03] shadow-[0_0_0_3px_rgba(14,124,123,0.12)]' : guideStep > 1 ? 'border-transparent' : 'border-transparent opacity-40 pointer-events-none'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="field-label" htmlFor="password">
                      รหัสผ่าน
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        className="field-input pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={8}
                        required
                      />
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
                    <p className="mt-1.5 text-xs text-ink/45">อย่างน้อย 8 ตัวอักษร</p>
                  </div>
                </div>
                {guideStep === 1 && (
                  <div className="mt-3 rounded-lg bg-teal px-3.5 py-2.5">
                    <p className="text-xs text-white leading-relaxed">
                      <span className="font-semibold">ขั้นตอนที่ 2 — </span>
                      ตั้งรหัสผ่านอย่างน้อย 8 ตัวอักษร กดปุ่มรูปตาค้างไว้เพื่อดูรหัสผ่านขณะพิมพ์
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

              {/* Guide: confirm password field */}
              <div className={`rounded-lg border-2 transition-all duration-300 p-4 mb-5 ${guideStep === 2 ? 'border-teal bg-teal/[0.03] shadow-[0_0_0_3px_rgba(14,124,123,0.12)]' : guideStep > 2 ? 'border-transparent' : 'border-transparent opacity-40 pointer-events-none'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="field-label" htmlFor="confirmPassword">
                      ยืนยันรหัสผ่าน
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        className="field-input pr-10"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        minLength={8}
                        required
                      />
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="mt-1.5 text-xs text-danger">รหัสผ่านไม่ตรงกัน</p>
                    )}
                  </div>
                </div>
                {guideStep === 2 && (
                  <div className="mt-3 rounded-lg bg-teal px-3.5 py-2.5">
                    <p className="text-xs text-white leading-relaxed">
                      <span className="font-semibold">ขั้นตอนที่ 3 — </span>
                      กรอกรหัสผ่านอีกครั้งเพื่อยืนยันว่ารหัสผ่านถูกต้อง ระบบจะตรวจสอบว่าตรงกันหรือไม่
                    </p>
                    <button
                      type="button"
                      onClick={() => setGuideStep(3)}
                      className="mt-2 rounded-md bg-white/20 px-3 py-1 text-xs font-medium text-white hover:bg-white/30 transition"
                    >
                      ถัดไป
                    </button>
                  </div>
                )}
              </div>

              {error && <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

              {/* Guide: submit button */}
              <div className={`transition-all duration-300 ${guideStep === 3 ? '' : 'opacity-40 pointer-events-none'}`}>
                {guideStep === 3 && (
                  <div className="mb-3 rounded-lg bg-teal px-3.5 py-2.5">
                    <p className="text-xs text-white leading-relaxed">
                      <span className="font-semibold">ขั้นตอนที่ 4 — </span>
                      ข้อมูลครบถ้วนแล้ว กดปุ่มดานล่างเพื่อสร้างบัญชีผู้ใช้และเริ่มต้นใช้งาน
                    </p>
                  </div>
                )}
                <button type="submit" className="btn-primary w-full" disabled={loading || (confirmPassword !== '' && password !== confirmPassword)}>
                  {loading ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-ink/60">
          มีบัญชีอยู่แล้ว?{" "}
          <Link href="/login" className="font-medium text-teal hover:underline">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>

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
