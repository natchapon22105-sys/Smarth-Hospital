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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/register/request-otp", { email, phone });
      setStep("otp");
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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "รหัส OTP ไม่ถูกต้อง");
    } finally {
      setLoading(false);
    }
  }

  async function completeRegistration(e: React.FormEvent) {
    e.preventDefault();
    if (!otpToken) return;
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/register", { email, phone, otpToken, username, password });
      router.push("/patient/profile");
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
            {step === "otp" && `กรอกรหัส OTP ที่ส่งไปที่ ${phone}`}
            {step === "credentials" && "ตั้งชื่อผู้ใช้และรหัสผ่าน"}
          </p>
        </div>

        <div className="card p-6 animate-[card-float_4s_ease-in-out_infinite]">
          {step === "contact" && (
            <form onSubmit={requestOtp}>
              <div className="mb-4">
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
              <div className="mb-5">
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
              {error && <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? "กำลังส่งรหัส..." : "ส่งรหัส OTP"}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={verifyOtp}>
              <div className="mb-5">
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
              {error && <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading || otp.length !== 6}>
                {loading ? "กำลังตรวจสอบ..." : "ยืนยันรหัส"}
              </button>
              <button
                type="button"
                onClick={() => setStep("contact")}
                className="mt-3 w-full text-center text-sm text-ink/60 hover:underline"
              >
                แก้ไขอีเมล/เบอร์โทร
              </button>
            </form>
          )}

          {step === "credentials" && (
            <form onSubmit={completeRegistration}>
              <div className="mb-4">
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
              <div className="mb-5">
                <label className="field-label" htmlFor="password">
                  รหัสผ่าน
                </label>
                <input
                  id="password"
                  type="password"
                  className="field-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <p className="mt-1.5 text-xs text-ink/45">อย่างน้อย 8 ตัวอักษร</p>
              </div>
              {error && <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
              </button>
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
