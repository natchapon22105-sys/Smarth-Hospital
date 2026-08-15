"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

type Settings = Record<string, string>;

type Department = {
  id: string;
  name: string;
  description: string | null;
  is_active: number;
  sort_order: number;
  created_at: string;
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({});
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [tab, setTab] = useState<"settings" | "departments">("settings");

  // Departments state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [showAddDept, setShowAddDept] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ name: "", description: "" });
  const [deptSaving, setDeptSaving] = useState(false);

  useEffect(() => {
    loadData();
    loadDepartments();
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

  async function loadDepartments() {
    setDeptLoading(true);
    try {
      const res = await api.get<{ departments: Department[] }>("/api/admin/departments");
      setDepartments(res.departments || []);
    } catch {
      // non-fatal
    } finally {
      setDeptLoading(false);
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

  async function handleAddDept() {
    if (!deptForm.name.trim()) return;
    setDeptSaving(true);
    setError(null);
    try {
      await api.post("/api/admin/departments", {
        name: deptForm.name.trim(),
        description: deptForm.description.trim() || undefined,
      });
      setDeptForm({ name: "", description: "" });
      setShowAddDept(false);
      await loadDepartments();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "เพิ่มแผนกไม่สำเร็จ");
    } finally {
      setDeptSaving(false);
    }
  }

  async function handleUpdateDept() {
    if (!editingDept || !deptForm.name.trim()) return;
    setDeptSaving(true);
    setError(null);
    try {
      await api.put(`/api/admin/departments/${editingDept.id}`, {
        name: deptForm.name.trim(),
        description: deptForm.description.trim() || null,
      });
      setEditingDept(null);
      setDeptForm({ name: "", description: "" });
      await loadDepartments();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "อัปเดตแผนกไม่สำเร็จ");
    } finally {
      setDeptSaving(false);
    }
  }

  async function handleToggleDept(dept: Department) {
    try {
      await api.put(`/api/admin/departments/${dept.id}`, { is_active: dept.is_active ? 0 : 1 });
      await loadDepartments();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "อัปเดตสถานะไม่สำเร็จ");
    }
  }

  async function handleDeleteDept(id: string) {
    if (!confirm("แน่ใจว่าต้องการลบแผนกนี้?")) return;
    try {
      await api.delete(`/api/admin/departments/${id}`);
      await loadDepartments();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ลบแผนกไม่สำเร็จ");
    }
  }

  function startEdit(dept: Department) {
    setEditingDept(dept);
    setDeptForm({ name: dept.name, description: dept.description || "" });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      {/* Floating circles */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-10 -top-10 h-40 w-40 animate-float-1 rounded-full border-2 border-teal/20" />
        <div className="absolute left-1/4 top-1/3 h-24 w-24 animate-float-2 rounded-full border-2 border-teal/15" />
        <div className="absolute right-[15%] top-[10%] h-32 w-32 animate-float-3 rounded-full border-2 border-teal/10" />
        <div className="absolute bottom-[20%] right-[10%] h-20 w-20 animate-float-4 rounded-full border-2 border-teal/15" />
        <span className="absolute left-[8%] top-[15%] animate-float-1 text-2xl font-light text-teal/10">+</span>
        <span className="absolute right-[20%] top-[30%] animate-float-2 text-3xl font-light text-teal/10">+</span>
        <span className="absolute left-[30%] bottom-[25%] animate-float-3 text-xl font-light text-teal/10">+</span>
        <span className="absolute right-[5%] bottom-[10%] animate-float-4 text-2xl font-light text-teal/10">+</span>
      </div>

      <header className="flex items-center gap-3 border-b border-line bg-white px-5 py-4">
        <button onClick={() => router.push("/admin")} className="text-sm text-teal hover:underline">
          ← หน้าหลัก
        </button>
        <span className="font-display text-lg font-semibold text-ink">ตั้งค่าระบบ</span>
      </header>

      <div className="mx-auto max-w-2xl space-y-5 px-5 py-6">
        {error && (
          <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-500">{error}</p>
        )}

        {/* Tab selector */}
        <div className="flex gap-2 rounded-xl2 border border-line bg-teal-light/30 p-1">
          <button
            type="button"
            onClick={() => setTab("settings")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              tab === "settings" ? "bg-teal text-white" : "text-ink/60 hover:text-ink"
            }`}
          >
            ตั้งค่าระบบ
          </button>
          <button
            type="button"
            onClick={() => setTab("departments")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              tab === "departments" ? "bg-teal text-white" : "text-ink/60 hover:text-ink"
            }`}
          >
            จัดการแผนก
          </button>
        </div>

        {tab === "settings" && (
          <div className="rounded-xl2 border border-line bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="field-label text-ink/55">จำนวนคิวสูงสุดต่อชั่วโมง</label>
                <input
                  type="number"
                  className="field-input w-full"
                  value={settings.max_queue_per_hour || ""}
                  onChange={(e) => setSettings({ ...settings, max_queue_per_hour: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label text-ink/55">AI Model</label>
                <select
                  className="field-input w-full"
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
                <label className="field-label text-ink/55">OpenRouter API Key</label>
                <div className="relative">
                  <input
                    type="text"
                    className="field-input w-full font-mono text-sm"
                    value={settings.openrouter_api_key || ""}
                    onChange={(e) => setSettings({ ...settings, openrouter_api_key: e.target.value })}
                    placeholder="sk-or-v1-..."
                  />
                  <p className="mt-1 text-xs text-ink/40">API Key จะถูกบันทึกลงใน database (ไม่ใช่ .env)</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label text-ink/55">เวลาเปิดให้บริการ</label>
                  <input
                    type="time"
                    className="field-input w-full"
                    value={settings.business_hours_start || "08:00"}
                    onChange={(e) => setSettings({ ...settings, business_hours_start: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label text-ink/55">เวลาปิดให้บริการ</label>
                  <input
                    type="time"
                    className="field-input w-full"
                    value={settings.business_hours_end || "16:30"}
                    onChange={(e) => setSettings({ ...settings, business_hours_end: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="field-label text-ink/55">ระยะเวลาต่อคิว (นาที)</label>
                <input
                  type="number"
                  className="field-input w-full"
                  value={settings.slot_duration_minutes || "30"}
                  onChange={(e) => setSettings({ ...settings, slot_duration_minutes: e.target.value })}
                  min={15}
                  max={120}
                  step={5}
                />
              </div>
            </div>
            {settingsSaved && <p className="mt-3 text-sm text-green-600">บันทึกสำเร็จ ✓</p>}
            <button
              onClick={handleSaveSettings}
              className="mt-5 w-full rounded-xl bg-teal px-5 py-3 text-[15px] font-medium text-white transition hover:bg-teal-dark disabled:opacity-50 disabled:pointer-events-none"
              disabled={settingsSaving}
            >
              {settingsSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
            </button>
          </div>
        )}

        {tab === "departments" && (
          <div className="space-y-4">
            {/* Add button */}
            {!showAddDept && !editingDept && (
              <button
                onClick={() => { setShowAddDept(true); setDeptForm({ name: "", description: "" }); }}
                className="flex w-full items-center justify-center gap-2 rounded-xl2 border-2 border-dashed border-line p-4 text-sm text-ink/50 transition hover:border-teal/30 hover:text-teal"
              >
                <span className="text-lg">+</span> เพิ่มแผนกใหม่
              </button>
            )}

            {/* Add/Edit form */}
            {(showAddDept || editingDept) && (
              <div className="rounded-xl2 border border-line bg-white p-5 shadow-sm">
                <h3 className="mb-3 font-display text-base font-semibold text-ink">
                  {editingDept ? "แก้ไขแผนก" : "เพิ่มแผนกใหม่"}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="field-label text-ink/55">ชื่อแผนก</label>
                    <input
                      type="text"
                      className="field-input w-full"
                      value={deptForm.name}
                      onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                      placeholder="เช่น อายุรกรรม"
                    />
                  </div>
                  <div>
                    <label className="field-label text-ink/55">รายละเอียด / ขอบเขตการรักษา</label>
                    <textarea
                      className="field-input w-full min-h-[80px] resize-y"
                      value={deptForm.description}
                      onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                      placeholder="ระบุขอบเขตการรักษาของแผนกนี้..."
                    />
                    <p className="mt-1 text-xs text-ink/40">คำอธิบายนี้จะถูกส่งให้ AI เพื่อใช้ในการแนะนำแผนกที่เหมาะสม</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={editingDept ? handleUpdateDept : handleAddDept}
                      className="flex-1 rounded-xl bg-teal px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-dark disabled:opacity-50"
                      disabled={deptSaving || !deptForm.name.trim()}
                    >
                      {deptSaving ? "กำลังบันทึก..." : editingDept ? "บันทึกการแก้ไข" : "เพิ่มแผนก"}
                    </button>
                    <button
                      onClick={() => { setShowAddDept(false); setEditingDept(null); setDeptForm({ name: "", description: "" }); }}
                      className="rounded-xl border border-line px-4 py-2.5 text-sm text-ink/60 hover:bg-line/50"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Department list */}
            {deptLoading ? (
              <p className="text-sm text-ink/50">กำลังโหลด...</p>
            ) : (
              <div className="space-y-2">
                {departments.map((dept) => (
                  <div
                    key={dept.id}
                    className={`rounded-xl2 border p-4 transition ${
                      dept.is_active
                        ? "border-line bg-white shadow-sm"
                        : "border-dashed border-line/50 bg-gray-50 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-base font-semibold text-ink">{dept.name}</span>
                          <span className="text-[10px] text-ink/40">ลำดับ {dept.sort_order}</span>
                        </div>
                        {dept.description && (
                          <p className="mt-1 text-sm text-ink/60">{dept.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-3">
                        <button
                          onClick={() => startEdit(dept)}
                          className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] text-ink/50 hover:bg-line/50"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleToggleDept(dept)}
                          className={`rounded-lg px-2.5 py-1.5 text-[11px] transition ${
                            dept.is_active
                              ? "border border-amber-300 text-amber-600 hover:bg-amber-50"
                              : "border border-teal/30 text-teal hover:bg-teal-light"
                          }`}
                        >
                          {dept.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                        </button>
                        <button
                          onClick={() => handleDeleteDept(dept.id)}
                          className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] text-red-400 hover:bg-red-50"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {departments.length === 0 && (
                  <p className="py-8 text-center text-sm text-ink/40">ยังไม่มีแผนกในระบบ</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
