"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";

export default function NurseLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/nurse-auth/login", { identifier, password });
      router.push("/nurse");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat opacity-[0.08]"
        style={{ backgroundImage: 'url("/usebackground.png")' }} />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-teal/20 shadow-lg">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0E7C7B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink">ระบบเวชระเบียน</h1>
          <p className="mt-1 text-sm text-ink/60">เข้าสู่ระบบสำหรับเวชระเบียน</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6">
          <div className="mb-4">
            <label className="field-label" htmlFor="identifier">อีเมล หรือ ชื่อผู้ใช้</label>
            <input id="identifier" className="field-input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          </div>
          <div className="mb-5">
            <label className="field-label" htmlFor="password">รหัสผ่าน</label>
            <input id="password" type="password" className="field-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink/60">
          ยังไม่มีบัญชี?{" "}
          <Link href="/nurse/register" className="font-medium text-teal hover:underline">
            ลงทะเบียน
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-ink/40">
          <Link href="/" className="hover:underline">กลับไปหน้าหลักผู้ใช้</Link>
        </p>
      </div>
    </main>
  );
}
