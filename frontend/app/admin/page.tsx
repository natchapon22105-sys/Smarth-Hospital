"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";

type DashboardData = {
  stats: {
    totalPatients: number;
    totalBookings: number;
    todayBookings: number;
    pendingBookings: number;
    confirmedToday: number;
  };
  bookingsPerDay: { day: string; count: number }[];
  deptStats: { recommended_department: string; count: number }[];
  recentBookings: any[];
};

type Settings = Record<string, string>;

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"dashboard" | "settings" | "usage">("dashboard");

  // Dashboard
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  // Settings
  const [settings, setSettings] = useState<Settings>({});
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Usage
  const [usage, setUsage] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [tab]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      if (tab === "dashboard") {
        const res = await api.get<DashboardData>("/api/admin/dashboard");
        setDashboard(res);
      } else if (tab === "settings") {
        const res = await api.get<{ settings: Settings }>("/api/admin/settings");
        setSettings(res.settings);
      } else if (tab === "usage") {
        const res = await api.get("/api/admin/usage");
        setUsage(res);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (ต้องการสิทธิ์ผู้ดูแลระบบ)");
        setTimeout(() => router.push("/app-home"), 2000);
      } else {
        setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings() {
    setSettingsSaving(true);
    setSettingsSaved(false);
    setError(null);
    try {
      await api.put("/api/admin/settings", { settings });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSettingsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg">
      <header className="flex items-center gap-3 border-b border-line bg-surface px-5 py-4">
        <button onClick={() => router.push("/app-home")} className="text-sm text-teal hover:underline">
          ← กลับ
        </button>
        <span className="font-display text-lg font-semibold text-ink">ระบบจัดการ</span>
      </header>

      {/* Tab nav */}
      <div className="flex border-b border-line bg-surface px-5">
        {[
          { id: "dashboard" as const, label: "แดชบอร์ด" },
          { id: "settings" as const, label: "ตั้งค่าระบบ" },
          { id: "usage" as const, label: "สถิติการใช้งาน" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
              tab === t.id ? "border-teal text-teal" : "border-transparent text-ink/60 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-4xl space-y-5 px-5 py-6">
        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        {loading ? (
          <p className="text-sm text-ink/50">กำลังโหลด...</p>
        ) : (
          <>
            {/* ---- DASHBOARD TAB ---- */}
            {tab === "dashboard" && dashboard && (
              <>
                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                  {[
                    { label: "คนไข้ทั้งหมด", value: dashboard.stats.totalPatients, color: "text-teal" },
                    { label: "จองทั้งหมด", value: dashboard.stats.totalBookings, color: "text-teal" },
                    { label: "จองวันนี้", value: dashboard.stats.todayBookings, color: "text-amber" },
                    { label: "รอดำเนินการ", value: dashboard.stats.pendingBookings, color: "text-amber" },
                    { label: "นัดวันนี้", value: dashboard.stats.confirmedToday, color: "text-green-600" },
                  ].map((card) => (
                    <div key={card.label} className="card p-4 text-center">
                      <p className="text-2xl font-bold font-mono">{card.value}</p>
                      <p className="mt-1 text-xs text-ink/60">{card.label}</p>
                    </div>
                  ))}
                </div>

                {/* Recent bookings */}
                <div className="card p-5">
                  <h2 className="mb-3 font-display text-[15px] font-semibold text-ink">รายการจองล่าสุด</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-line text-ink/50">
                          <th className="pb-2 pr-3 font-medium">วันที่</th>
                          <th className="pb-2 pr-3 font-medium">ผู้ใช้</th>
                          <th className="pb-2 pr-3 font-medium">แผนก</th>
                          <th className="pb-2 pr-3 font-medium">ความเร่งด่วน</th>
                          <th className="pb-2 font-medium">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.recentBookings.map((b: any) => (
                          <tr key={b.id} className="border-b border-line/50">
                            <td className="py-2 pr-3 text-ink/70">{new Date(b.created_at).toLocaleString("th-TH")}</td>
                            <td className="py-2 pr-3 text-ink/70">{b.username || b.email}</td>
                            <td className="py-2 pr-3 text-teal-dark">{b.recommended_department || "-"}</td>
                            <td className="py-2 pr-3">
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{b.urgency || "-"}</span>
                            </td>
                            <td className="py-2">{b.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ---- SETTINGS TAB ---- */}
            {tab === "settings" && (
              <div className="card p-6">
                <h2 className="mb-4 font-display text-[15px] font-semibold text-ink">ตั้งค่าระบบ</h2>
                <div className="space-y-4">
                  <div>
                    <label className="field-label">จำนวนคิวสูงสุดต่อชั่วโมง</label>
                    <input
                      type="number"
                      className="field-input"
                      value={settings.max_queue_per_hour || ""}
                      onChange={(e) => setSettings({ ...settings, max_queue_per_hour: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="field-label">AI Model</label>
                    <select
                      className="field-input"
                      value={settings.ai_model || "gpt-4o-mini"}
                      onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
                    >
                      <option value="gpt-4o-mini">GPT-4o-mini</option>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="claude-3-opus">Claude 3 Opus</option>
                      <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">OpenRouter API Key</label>
                    <div className="relative">
                      <input
                        type="text"
                        className="field-input font-mono text-sm"
                        value={settings.openrouter_api_key || ""}
                        onChange={(e) => setSettings({ ...settings, openrouter_api_key: e.target.value })}
                        placeholder="sk-or-v1-..."
                      />
                      <p className="mt-1 text-xs text-ink/45">API Key จะถูกบันทึกลงใน database (ไม่ใช่ .env)</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="field-label">เวลาเปิดให้บริการ</label>
                      <input
                        type="time"
                        className="field-input"
                        value={settings.business_hours_start || "08:00"}
                        onChange={(e) => setSettings({ ...settings, business_hours_start: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="field-label">เวลาปิดให้บริการ</label>
                      <input
                        type="time"
                        className="field-input"
                        value={settings.business_hours_end || "16:30"}
                        onChange={(e) => setSettings({ ...settings, business_hours_end: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="field-label">ระยะเวลาต่อคิว (นาที)</label>
                    <input
                      type="number"
                      className="field-input"
                      value={settings.slot_duration_minutes || "30"}
                      onChange={(e) => setSettings({ ...settings, slot_duration_minutes: e.target.value })}
                      min={15}
                      max={120}
                      step={5}
                    />
                  </div>
                </div>
                {settingsSaved && <p className="mt-3 text-sm text-teal-dark">บันทึกสำเร็จ ✓</p>}
                <button
                  onClick={handleSaveSettings}
                  className="btn-primary mt-5 w-full"
                  disabled={settingsSaving}
                >
                  {settingsSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                </button>
              </div>
            )}

            {/* ---- USAGE STATS TAB ---- */}
            {tab === "usage" && usage && (
              <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    { label: "ผู้ใช้ทั้งหมด", value: usage.usage.totalUsers },
                    { label: "ผู้ดูแลระบบ", value: usage.usage.totalAdmins },
                    { label: "การจองทั้งหมด", value: usage.usage.totalBookings },
                    { label: "จองวันนี้", value: usage.usage.todayBookings },
                  ].map((card) => (
                    <div key={card.label} className="card p-4 text-center">
                      <p className="text-2xl font-bold font-mono">{card.value}</p>
                      <p className="mt-1 text-xs text-ink/60">{card.label}</p>
                    </div>
                  ))}
                </div>

                {/* Bookings by month */}
                {usage.monthlyBookings?.length > 0 && (
                  <div className="card p-5">
                    <h2 className="mb-3 font-display text-[15px] font-semibold text-ink">การจองรายเดือน</h2>
                    <div className="space-y-2">
                      {usage.monthlyBookings.map((m: any) => (
                        <div key={m.month} className="flex items-center gap-3">
                          <span className="w-20 text-sm text-ink/70">{m.month}</span>
                          <div className="flex-1 rounded-full bg-teal-light">
                            <div
                              className="rounded-full bg-teal py-1 text-center text-xs text-white"
                              style={{ width: `${Math.min(100, (m.count / 50) * 100)}%` }}
                            >
                              {m.count}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}