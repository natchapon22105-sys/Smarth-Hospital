"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

type Settings = Record<string, string>;

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({});
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ settings: Settings }>("/api/admin/settings");
      setSettings(res.settings);
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
        <span className="font-display text-lg font-semibold text-white/90 drop-shadow">ตั้งค่าระบบ</span>
      </header>

      <div className="mx-auto max-w-2xl space-y-5 px-5 py-6 animate-fade-in-up">
        {error && (
          <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        {loading ? (
          <p className="text-sm text-white/50">กำลังโหลด...</p>
        ) : (
          <div className="rounded-xl2 border border-white/10 bg-navy/40 p-6 shadow-navy-card backdrop-blur-md">
            <div className="space-y-4">
              <div>
                <label className="field-label text-white/55">จำนวนคิวสูงสุดต่อชั่วโมง</label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[15px] text-white/80 placeholder:text-white/30 outline-none transition focus:border-navy-accent/60"
                  value={settings.max_queue_per_hour || ""}
                  onChange={(e) => setSettings({ ...settings, max_queue_per_hour: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label text-white/55">AI Model</label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[15px] text-white/80 outline-none transition focus:border-navy-accent/60"
                  value={settings.ai_model || "gpt-4o-mini"}
                  onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
                >
                  <option value="gpt-4o-mini" className="bg-navy-dark">GPT-4o-mini</option>
                  <option value="gpt-4o" className="bg-navy-dark">GPT-4o</option>
                  <option value="gpt-4-turbo" className="bg-navy-dark">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo" className="bg-navy-dark">GPT-3.5 Turbo</option>
                  <option value="claude-3-opus" className="bg-navy-dark">Claude 3 Opus</option>
                  <option value="claude-3-sonnet" className="bg-navy-dark">Claude 3 Sonnet</option>
                </select>
              </div>
              <div>
                <label className="field-label text-white/55">OpenRouter API Key</label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-sm text-white/80 placeholder:text-white/30 outline-none transition focus:border-navy-accent/60"
                    value={settings.openrouter_api_key || ""}
                    onChange={(e) => setSettings({ ...settings, openrouter_api_key: e.target.value })}
                    placeholder="sk-or-v1-..."
                  />
                  <p className="mt-1 text-xs text-white/40">API Key จะถูกบันทึกลงใน database (ไม่ใช่ .env)</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label text-white/55">เวลาเปิดให้บริการ</label>
                  <input
                    type="time"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[15px] text-white/80 outline-none transition focus:border-navy-accent/60"
                    value={settings.business_hours_start || "08:00"}
                    onChange={(e) => setSettings({ ...settings, business_hours_start: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label text-white/55">เวลาปิดให้บริการ</label>
                  <input
                    type="time"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[15px] text-white/80 outline-none transition focus:border-navy-accent/60"
                    value={settings.business_hours_end || "16:30"}
                    onChange={(e) => setSettings({ ...settings, business_hours_end: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="field-label text-white/55">ระยะเวลาต่อคิว (นาที)</label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[15px] text-white/80 placeholder:text-white/30 outline-none transition focus:border-navy-accent/60"
                  value={settings.slot_duration_minutes || "30"}
                  onChange={(e) => setSettings({ ...settings, slot_duration_minutes: e.target.value })}
                  min={15}
                  max={120}
                  step={5}
                />
              </div>
            </div>
            {settingsSaved && <p className="mt-3 text-sm text-green-400">บันทึกสำเร็จ ✓</p>}
            <button
              onClick={handleSaveSettings}
              className="mt-5 w-full rounded-xl bg-navy-accent px-5 py-3 text-[15px] font-medium text-white shadow-navy-glow transition hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none"
              disabled={settingsSaving}
            >
              {settingsSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
