"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

export default function AdminUsagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/admin/usage");
      setUsage(res);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (ต้องการสิทธิ์ผู้ดูแลระบบ)");
        setTimeout(() => router.push("/admin/login"), 2000);
      } else {
        setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none fixed inset-0 -z-10 animate-bg-pan bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/usebackground.png")' }}
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-navy-deeper via-navy-dark to-navy" />
      <div className="pointer-events-none fixed inset-0 -z-10 animate-pulse-glow bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.25),transparent_55%)]" />

      <header className="flex animate-fade-in-up items-center gap-3 border-b border-white/10 bg-navy/40 px-5 py-4 backdrop-blur-md">
        <button onClick={() => router.push("/admin")} className="text-sm text-navy-accent hover:text-white hover:underline">
          ← หน้าหลัก
        </button>
        <span className="font-display text-lg font-semibold text-white/90 drop-shadow">สถิติการใช้งาน</span>
      </header>

      <div className="mx-auto max-w-4xl space-y-5 px-5 py-6 animate-fade-in-up">
        {error && (
          <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        {loading ? (
          <p className="text-sm text-white/50">กำลังโหลด...</p>
        ) : usage ? (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: "ผู้ใช้ทั้งหมด", value: usage.usage.totalUsers },
                { label: "ผู้ดูแลระบบ", value: usage.usage.totalAdmins },
                { label: "การจองทั้งหมด", value: usage.usage.totalBookings },
                { label: "จองวันนี้", value: usage.usage.todayBookings },
              ].map((card) => (
                <div key={card.label} className="rounded-xl2 border border-white/10 bg-navy/40 p-4 text-center shadow-navy-card backdrop-blur-md">
                  <p className="text-2xl font-bold font-mono text-navy-accent">{card.value}</p>
                  <p className="mt-1 text-xs text-white/60">{card.label}</p>
                </div>
              ))}
            </div>

            {/* AI Usage Stats */}
            {usage.aiStats && (
              <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-xl2 border border-white/10 bg-navy/40 p-4 text-center shadow-navy-card backdrop-blur-md">
                    <p className="text-2xl font-bold font-mono text-teal-light">{usage.aiStats.totalCalls}</p>
                    <p className="mt-1 text-xs text-white/60">AI เรียกใช้ทั้งหมด</p>
                  </div>
                  <div className="rounded-xl2 border border-white/10 bg-navy/40 p-4 text-center shadow-navy-card backdrop-blur-md">
                    <p className="text-2xl font-bold font-mono text-teal-light">{usage.aiStats.totalTokens.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-white/60">Token ที่ใช้ทั้งหมด</p>
                  </div>
                  <div className="rounded-xl2 border border-white/10 bg-navy/40 p-4 text-center shadow-navy-card backdrop-blur-md">
                    <p className="text-2xl font-bold font-mono text-teal-light">{usage.aiStats.todayCalls}</p>
                    <p className="mt-1 text-xs text-white/60">AI เรียกใช้วันนี้</p>
                  </div>
                  <div className="rounded-xl2 border border-white/10 bg-navy/40 p-4 text-center shadow-navy-card backdrop-blur-md">
                    <p className="text-2xl font-bold font-mono text-teal-light">{usage.aiStats.avgUsersPerDay}</p>
                    <p className="mt-1 text-xs text-white/60">ค่าเฉลี่ยผู้ใช้ AI/วัน</p>
                  </div>
                </div>

                {/* AI tokens per day */}
                <div className="rounded-xl2 border border-white/10 bg-navy/40 p-5 shadow-navy-card backdrop-blur-md">
                  <h2 className="mb-3 font-display text-[15px] font-semibold text-white/90">Token AI รายวัน (14 วันล่าสุด)</h2>
                  {usage.aiStats.aiTokensPerDay?.length > 0 ? (
                    <svg viewBox="0 0 700 180" className="w-full" preserveAspectRatio="xMidYMid meet">
                      {(() => {
                        const data = usage.aiStats.aiTokensPerDay;
                        const maxTokens = Math.max(...data.map((d: any) => d.tokens), 1);
                        const w = 700;
                        const h = 160;
                        const pad = 10;
                        const chartW = w - pad * 2;
                        const chartH = h - pad * 2;
                        const len = data.length;
                        const stepX = len > 1 ? chartW / (len - 1) : 0;

                        const points = data.map((d: any, i: number) => ({
                          x: len > 1 ? pad + i * stepX : w / 2,
                          y: pad + chartH - (d.tokens / maxTokens) * chartH,
                          label: d.day.slice(5),
                          value: d.tokens,
                        }));

                        const linePath = points.map((p: any, i: number) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
                        const areaPath = linePath + ` L${points[points.length - 1].x},${pad + chartH} L${points[0].x},${pad + chartH} Z`;

                        return (
                          <>
                            {/* Grid lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((r) => (
                              <line key={r} x1={pad} x2={w - pad} y1={pad + chartH - r * chartH} y2={pad + chartH - r * chartH} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                            ))}
                            {/* Area fill */}
                            <path d={areaPath} fill="url(#tealGrad)" opacity="0.3" />
                            {/* Line */}
                            <path d={linePath} fill="none" stroke="#22D3EE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            {/* Dots */}
                            {points.map((p: any, i: number) => (
                              <g key={i}>
                                <circle cx={p.x} cy={p.y} r="5" fill="#071427" stroke="#22D3EE" strokeWidth="2.5" />
                                <circle cx={p.x} cy={p.y} r="3" fill="#22D3EE" />
                                {/* Label */}
                                <text x={p.x} y={pad + chartH + 14} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">{p.label}</text>
                                {/* Value tooltip on hover */}
                                <text x={p.x} y={p.y - 10} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9">{p.value.toLocaleString()}</text>
                              </g>
                            ))}
                            <defs>
                              <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.5" />
                                <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                          </>
                        );
                      })()}
                    </svg>
                  ) : (
                    <p className="text-sm text-white/40">ยังไม่มีข้อมูล AI</p>
                  )}
                </div>

                {/* AI usage by step */}
                <div className="rounded-xl2 border border-white/10 bg-navy/40 p-5 shadow-navy-card backdrop-blur-md">
                  <h2 className="mb-3 font-display text-[15px] font-semibold text-white/90">การใช้งาน AI แยกตามขั้นตอน</h2>
                  <div className="space-y-2">
                    {usage.aiStats.aiSteps?.length > 0 ? usage.aiStats.aiSteps.map((s: any) => (
                      <div key={s.step} className="flex items-center justify-between rounded-lg border border-white/10 bg-navy-deeper/30 px-4 py-3">
                        <span className="text-sm text-white/80">{s.step === "questions" ? "ซักประวัติ (ตั้งคำถาม)" : "วิเคราะห์ผล"}</span>
                        <div className="flex gap-4 text-xs text-white/50">
                          <span>{s.calls} ครั้ง</span>
                          <span>{s.tokens.toLocaleString()} token</span>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-white/40">ยังไม่มีข้อมูล AI</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {usage.monthlyBookings?.length > 0 && (
              <div className="rounded-xl2 border border-white/10 bg-navy/40 p-5 shadow-navy-card backdrop-blur-md">
                <h2 className="mb-3 font-display text-[15px] font-semibold text-white/90">การจองรายเดือน</h2>
                <svg viewBox="0 0 600 180" className="w-full" preserveAspectRatio="xMidYMid meet">
                  {(() => {
                    const data = usage.monthlyBookings;
                    const maxCount = Math.max(...data.map((d: any) => d.count), 1);
                    const w = 600;
                    const h = 160;
                    const pad = 10;
                    const chartW = w - pad * 2;
                    const chartH = h - pad * 2;
                    const len = data.length;
                    const stepX = len > 1 ? chartW / (len - 1) : 0;

                    const points = data.map((d: any, i: number) => ({
                      x: len > 1 ? pad + i * stepX : w / 2,
                      y: pad + chartH - (d.count / maxCount) * chartH,
                      label: d.month.replace("-", "/"),
                      value: d.count,
                    }));

                    const linePath = points.map((p: any, i: number) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
                    const areaPath = linePath + ` L${points[points.length - 1].x},${pad + chartH} L${points[0].x},${pad + chartH} Z`;

                    return (
                      <>
                        {[0, 0.25, 0.5, 0.75, 1].map((r) => (
                          <line key={r} x1={pad} x2={w - pad} y1={pad + chartH - r * chartH} y2={pad + chartH - r * chartH} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                        ))}
                        <path d={areaPath} fill="url(#blueGrad)" opacity="0.3" />
                        <path d={linePath} fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {points.map((p: any, i: number) => (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r="5" fill="#071427" stroke="#60A5FA" strokeWidth="2.5" />
                            <circle cx={p.x} cy={p.y} r="3" fill="#60A5FA" />
                            <text x={p.x} y={pad + chartH + 14} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">{p.label}</text>
                            <text x={p.x} y={p.y - 10} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9">{p.value}</text>
                          </g>
                        ))}
                        <defs>
                          <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}
