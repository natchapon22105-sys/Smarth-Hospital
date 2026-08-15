"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app-home";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/login", { identifier, password });
      router.push(next);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4" style={{ perspective: "1200px" }}>
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
          <p className="mt-1 text-sm text-ink/60">เข้าสู่ระบบเพื่อเริ่มการนัดหมายและประวัติสุขภาพ</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 animate-[card-float_4s_ease-in-out_infinite]">
          <div className="mb-4">
            <label className="field-label" htmlFor="identifier">
              อีเมล หรือ ชื่อผู้ใช้
            </label>
            <input
              id="identifier"
              className="field-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="mb-1">
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
                autoComplete="current-password"
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
            <div className="mt-1.5 text-right">
              <Link href="/forgot-password" className="text-xs text-teal hover:underline">
                ลืมรหัสผ่าน?
              </Link>
            </div>
          </div>

          {error && (
            <p role="alert" className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink/60">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="font-medium text-teal hover:underline">
            สมัครสมาชิก
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
