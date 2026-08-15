"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

type User = {
  id: string;
  email: string;
  username: string;
  phone: string;
  role: string;
  created_at: string;
  last_activity: string | null;
  first_name_th: string | null;
  last_name_th: string | null;
  national_id: string | null;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ email: "", username: "", phone: "", role: "" });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  async function loadUsers(q?: string) {
    setLoading(true);
    setError(null);
    try {
      const path = q ? `/api/admin/users?search=${encodeURIComponent(q)}` : "/api/admin/users";
      const res = await api.get<{ users: User[] }>(path);
      setUsers(res.users);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        router.push("/admin/login?next=/admin/users");
      } else {
        setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadUsers(search);
  }

  function startEdit(u: User) {
    setEditingId(u.id);
    setEditForm({ email: u.email, username: u.username, phone: u.phone, role: u.role });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      await api.put(`/api/admin/users/${editingId}`, editForm);
      setEditingId(null);
      loadUsers(search);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(id: string) {
    setError(null);
    try {
      await api.delete(`/api/admin/users/${id}`);
      setDeleteConfirm(null);
      loadUsers(search);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ลบไม่สำเร็จ");
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
        <button
          onClick={() => router.push("/admin")}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-display text-lg font-semibold text-white/90 drop-shadow">จัดการบัญชีผู้ใช้</span>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-6 animate-fade-in-up">
        {error && (
          <p className="mb-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-5 flex gap-2">
          <input
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-[15px] text-white placeholder:text-white/35 outline-none transition focus:border-navy-accent"
            placeholder="ค้นหาชื่อ / อีเมล / เบอร์โทร / เลขบัตรฯ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-xl bg-navy-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            ค้นหา
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-white/50">กำลังโหลด...</p>
        ) : users.length === 0 ? (
          <div className="rounded-xl2 border border-white/10 bg-navy/40 p-8 text-center backdrop-blur-md">
            <p className="text-white/60">ไม่พบผู้ใช้</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl2 border border-white/10 bg-navy/40 backdrop-blur-md">
            <table className="w-full text-sm text-white/80">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-white/50">
                  <th className="px-4 py-3 font-medium">ชื่อ</th>
                  <th className="px-4 py-3 font-medium">อีเมล</th>
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">เบอร์โทร</th>
                  <th className="px-4 py-3 font-medium">สิทธิ์</th>
                  <th className="px-4 py-3 font-medium">สมัครเมื่อ</th>
                  <th className="px-4 py-3 font-medium text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                    {editingId === u.id ? (
                      <>
                        <td className="px-4 py-3" colSpan={2}>
                          <input
                            className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none focus:border-navy-accent"
                            value={editForm.email}
                            onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none focus:border-navy-accent"
                            value={editForm.username}
                            onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none focus:border-navy-accent"
                            value={editForm.phone}
                            onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none focus:border-navy-accent"
                            value={editForm.role}
                            onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs text-white/40">{u.created_at?.slice(0, 10)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={saveEdit}
                              disabled={saving}
                              className="rounded-lg bg-green-600/80 px-2.5 py-1 text-xs text-white transition hover:bg-green-500 disabled:opacity-50"
                            >
                              {saving ? "..." : "บันทึก"}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded-lg bg-white/10 px-2.5 py-1 text-xs text-white/60 transition hover:bg-white/20"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <span className="text-white/90">{u.first_name_th || u.last_name_th ? `${u.first_name_th || ""} ${u.last_name_th || ""}`.trim() : "-"}</span>
                        </td>
                        <td className="px-4 py-3 text-white/70">{u.email}</td>
                        <td className="px-4 py-3 text-white/70">{u.username}</td>
                        <td className="px-4 py-3 text-white/70">{u.phone || "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${u.role === "admin" ? "bg-yellow-500/20 text-yellow-300" : "bg-blue-500/15 text-blue-300"}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-white/40">{u.created_at?.slice(0, 10)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => startEdit(u)}
                              className="rounded-lg bg-navy-accent/20 px-2.5 py-1 text-xs text-navy-accent transition hover:bg-navy-accent/30"
                            >
                              แก้ไข
                            </button>
                            {u.role !== "admin" && (
                              <button
                                onClick={() => setDeleteConfirm(u.id)}
                                className="rounded-lg bg-red-500/15 px-2.5 py-1 text-xs text-red-300 transition hover:bg-red-500/25"
                              >
                                ลบ
                              </button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-white/30">
          ทั้งหมด {users.length} บัญชี
        </p>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-xl2 border border-white/10 bg-navy p-6 shadow-navy-card backdrop-blur-xl">
            <h3 className="font-display text-base font-semibold text-white">ยืนยันการลบ</h3>
            <p className="mt-2 text-sm text-white/60">
              คุณแน่ใจหรือไม่ที่จะลบบัญชีนี้? ขอมูลทั้งหมดของผูใชคนนี้จะถูกลบออกจากระบบ
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => confirmDelete(deleteConfirm)}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-400"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}