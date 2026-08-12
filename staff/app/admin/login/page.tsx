"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";

function AdminLoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/admin/login", { identifier, password, remember });
      router.push(next);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Animated background image */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 animate-bg-pan bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/usebackground.png")' }}
      />
      {/* Navy gradient overlay */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-navy-deeper via-navy-dark to-navy" />
      <div className="pointer-events-none fixed inset-0 -z-10 animate-pulse-glow bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.25),transparent_55%)]" />

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-navy-accent/30 bg-navy/40 shadow-navy-glow backdrop-blur-md">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-semibold text-white drop-shadow">ระบบแอดมิน</h1>
          <p className="mt-1 text-sm text-white/60">เข้าสู่ระบบสำหรับผู้ดูแลระบบ</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl2 border border-white/10 bg-navy/40 p-6 shadow-navy-card backdrop-blur-md">
          <div className="mb-4">
            <label className="field-label text-white/70" htmlFor="identifier">อีเมล หรือ ชื่อผู้ใช้</label>
            <input id="identifier" className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-[15px] text-white placeholder:text-white/35 outline-none transition focus:border-navy-accent" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          </div>
          <div className="mb-5">
            <label className="field-label text-white/70" htmlFor="password">รหัสผ่าน</label>
            <input id="password" type="password" className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-[15px] text-white placeholder:text-white/35 outline-none transition focus:border-navy-accent" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="mb-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>}
          <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-white/60">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 accent-navy-accent"
            />
            จดจำฉันไว้ในเครื่องนี้ (ล็อกอินค้างได้ 30 วัน)
          </label>
          <button type="submit" className="w-full rounded-xl bg-navy-accent px-5 py-3 text-[15px] font-medium text-white shadow-navy-glow transition hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="mt-2 text-center text-xs text-white/40">
          <Link href="/nurse/login" className="hover:text-white hover:underline">เข้าสู่ระบบสำหรับพยาบาล</Link>
        </p>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginPageInner />
    </Suspense>
  );
}
