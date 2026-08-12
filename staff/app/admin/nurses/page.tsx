"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import Modal from "@/components/Modal";

export default function AdminNursesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingNurses, setPendingNurses] = useState<any[]>([]);
  const [allNurses, setAllNurses] = useState<any[]>([]);

  const [selectedNurse, setSelectedNurse] = useState<any | null>(null);
  const [nurseActivity, setNurseActivity] = useState<any[]>([]);
  const [loadingNurseActivity, setLoadingNurseActivity] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [pendingRes, allRes] = await Promise.all([
        api.get<{ nurses: any[] }>("/api/admin/nurses/pending"),
        api.get<{ nurses: any[] }>("/api/admin/nurses/all"),
      ]);
      setPendingNurses(pendingRes.nurses);
      setAllNurses(allRes.nurses);
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

  async function openNurseDetail(n: any) {
    setSelectedNurse(n);
    setLoadingNurseActivity(true);
    setNurseActivity([]);
    try {
      const res = await api.get<{ activity: any[] }>(`/api/nurse-auth/activity/${n.id}`);
      setNurseActivity(res.activity || []);
    } catch {
      setNurseActivity([]);
    } finally {
      setLoadingNurseActivity(false);
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
        <span className="font-display text-lg font-semibold text-white/90 drop-shadow">จัดการพยาบาล</span>
      </header>

      <div className="mx-auto max-w-4xl space-y-5 px-5 py-6 animate-fade-in-up">
        {error && (
          <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        {loading ? (
          <p className="text-sm text-white/50">กำลังโหลด...</p>
        ) : (
          <>
            {/* Pending requests */}
            <div className="rounded-xl2 border border-white/10 bg-navy/40 p-5 shadow-navy-card backdrop-blur-md">
              <h2 className="mb-3 font-display text-[15px] font-semibold text-white/90">คำขอที่รออนุมัติ</h2>
              {pendingNurses.length === 0 ? (
                <p className="text-sm text-white/50">ไม่มีคำขอที่รออนุมัติ</p>
              ) : (
                <div className="space-y-3">
                  {pendingNurses.map((n: any) => (
                    <div key={n.id} className="flex items-center justify-between rounded-xl border border-amber-200/30 bg-amber-50/10 p-4">
                      <div>
                        <p className="font-medium text-white">{n.full_name}</p>
                        <p className="text-sm text-white/60">{n.email} · {n.username}</p>
                        {n.phone && <p className="text-xs text-white/40">โทร: {n.phone}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            await api.post(`/api/admin/nurses/approve/${n.id}`);
                            loadData();
                          }}
                          className="rounded-lg bg-navy-accent px-4 py-2 text-sm font-medium text-white shadow-navy-glow transition hover:bg-blue-500"
                        >
                          อนุมัติ
                        </button>
                        <button
                          onClick={async () => {
                            await api.post(`/api/admin/nurses/reject/${n.id}`);
                            loadData();
                          }}
                          className="rounded-lg border border-red-300/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
                        >
                          ปฏิเสธ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All nurses */}
            <div className="rounded-xl2 border border-white/10 bg-navy/40 p-5 shadow-navy-card backdrop-blur-md">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-[15px] font-semibold text-white/90">พยาบาลทั้งหมด</h2>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-xs text-green-300">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                    ออนไลน์ {allNurses.filter((n: any) => n.isOnline).length}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
                    <span className="inline-block h-2 w-2 rounded-full bg-white/40" />
                    ออฟไลน์ {allNurses.filter((n: any) => !n.isOnline).length}
                  </span>
                </div>
              </div>
              {allNurses.length === 0 ? (
                <p className="text-sm text-white/50">ยังไม่มีพยาบาล</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-white/50">
                        <th className="pb-2 pr-3 font-medium">สถานะ</th>
                        <th className="pb-2 pr-3 font-medium">ชื่อ</th>
                        <th className="pb-2 pr-3 font-medium">อีเมล</th>
                        <th className="pb-2 pr-3 font-medium">Username</th>
                        <th className="pb-2 pr-3 font-medium">สถานะบัญชี</th>
                        <th className="pb-2 pr-3 font-medium">กิจกรรมวันนี้</th>
                        <th className="pb-2 font-medium">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allNurses.map((n: any) => (
                        <tr
                          key={n.id}
                          onClick={() => openNurseDetail(n)}
                          className="cursor-pointer border-b border-white/5 transition hover:bg-white/5"
                        >
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                                n.isOnline ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" : "bg-white/30"
                              }`} />
                              <span className="text-xs text-white/50">{n.isOnline ? "ออนไลน์" : "ออฟไลน์"}</span>
                            </div>
                          </td>
                          <td className="py-2 pr-3 text-white/70">{n.full_name}</td>
                          <td className="py-2 pr-3 text-white/70">{n.email}</td>
                          <td className="py-2 pr-3 text-white/70">{n.username}</td>
                          <td className="py-2 pr-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs ${
                              n.status === "approved" ? "bg-green-500/20 text-green-300" :
                              n.status === "rejected" ? "bg-red-500/20 text-red-300" :
                              "bg-amber-500/20 text-amber-300"
                            }`}>{n.status}</span>
                          </td>
                          <td className="py-2 pr-3 text-xs text-white/50">{n.todayActions ?? 0} ครั้ง</td>
                          <td className="py-2">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!confirm(`ยืนยันลบพยาบาล "${n.full_name}" (${n.email})?`)) return;
                                await api.delete(`/api/admin/nurses/delete/${n.id}`);
                                loadData();
                              }}
                              className="rounded-lg border border-red-300/40 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10"
                            >
                              ลบ
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Nurse detail modal */}
      <Modal open={!!selectedNurse} onClose={() => setSelectedNurse(null)} title="ข้อมูลพยาบาล">
        {selectedNurse && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                selectedNurse.isOnline ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" : "bg-white/30"
              }`} />
              <span className="text-white/70">{selectedNurse.isOnline ? "ออนไลน์" : "ออฟไลน์"}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-white/50">ชื่อ</p>
                <p className="text-white/90">{selectedNurse.full_name}</p>
              </div>
              <div>
                <p className="text-white/50">Username</p>
                <p className="text-white/90">{selectedNurse.username}</p>
              </div>
              <div>
                <p className="text-white/50">อีเมล</p>
                <p className="text-white/90">{selectedNurse.email}</p>
              </div>
              <div>
                <p className="text-white/50">โทรศัพท์</p>
                <p className="text-white/90">{selectedNurse.phone || "-"}</p>
              </div>
              <div>
                <p className="text-white/50">สถานะบัญชี</p>
                <p className="text-white/90">{selectedNurse.status}</p>
              </div>
              <div>
                <p className="text-white/50">กิจกรรมวันนี้</p>
                <p className="text-white/90">{selectedNurse.todayActions ?? 0} ครั้ง</p>
              </div>
              <div>
                <p className="text-white/50">เข้าร่วมเมื่อ</p>
                <p className="text-white/90">{selectedNurse.created_at ? new Date(selectedNurse.created_at).toLocaleString("th-TH") : "-"}</p>
              </div>
              <div>
                <p className="text-white/50">เข้าสู่ระบบล่าสุด</p>
                <p className="text-white/90">{selectedNurse.last_activity ? new Date(selectedNurse.last_activity).toLocaleString("th-TH") : "-"}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-white/50">ประวัติกิจกรรม</p>
              {loadingNurseActivity ? (
                <p className="text-white/40">กำลังโหลด...</p>
              ) : nurseActivity.length === 0 ? (
                <p className="text-white/40">ไม่มีประวัติกิจกรรม</p>
              ) : (
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {nurseActivity.map((a: any, i: number) => (
                    <div key={i} className="rounded-lg bg-white/5 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-white/80">{a.action || a.activity_type || "-"}</span>
                        <span className="text-xs text-white/40">
                          {a.created_at ? new Date(a.created_at).toLocaleString("th-TH") : ""}
                        </span>
                      </div>
                      {a.detail && <p className="mt-1 text-xs text-white/50">{a.detail}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
