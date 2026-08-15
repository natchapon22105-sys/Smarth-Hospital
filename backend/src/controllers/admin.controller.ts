import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "../db/db";
import { bangkokToday } from "../utils/bangkok";
import { createSession, setSessionCookie } from "../utils/session";
import { verifyPassword } from "../utils/password";

// ---------------------------------------------------------------------------
// POST /api/admin/login   { identifier, password }   identifier = email or username
// ---------------------------------------------------------------------------
export async function loginAdmin(req: Request, res: Response) {
  try {
    const schema = z.object({
      identifier: z.string().min(1),
      password: z.string().min(1),
      remember: z.boolean().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_input" });
    }

    const { identifier, password, remember } = parsed.data;

    const user = db
      .prepare(`SELECT * FROM users WHERE (email = ? OR username = ?) AND role = 'admin'`)
      .get(identifier, identifier) as any;

    if (!user) {
      return res.status(401).json({ error: "invalid_credentials", message: "ไม่พบบัญชีแอดมิน" });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "invalid_credentials", message: "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง" });
    }

    const session = createSession(user.id, remember === true);
    setSessionCookie(res, session.id, remember === true);

    return res.json({
      ok: true,
      user: { id: user.id, email: user.email, username: user.username, fullName: user.full_name },
    });
  } catch (err) {
    console.error("loginAdmin error:", err);
    return res.status(500).json({ error: "server_error", message: "เข้าสู่ระบบไม่สำเร็จ" });
  }
}

// ---------------------------------------------------------------------------
// GET /api/admin/dashboard — statistics
// ---------------------------------------------------------------------------
export function getDashboard(req: Request, res: Response) {
  const today = bangkokToday();

  const totalPatients = (db.prepare(`SELECT COUNT(*) as c FROM patients`).get() as any).c;
  const totalBookings = (db.prepare(`SELECT COUNT(*) as c FROM bookings`).get() as any).c;
  const todayBookings = (db.prepare(`SELECT COUNT(*) as c FROM bookings WHERE date(created_at) = ?`).get(today) as any).c;
  const pendingBookings = (db.prepare(`SELECT COUNT(*) as c FROM bookings WHERE status = 'pending'`).get() as any).c;
  const confirmedToday = (db.prepare(`SELECT COUNT(*) as c FROM bookings WHERE appointment_date = ? AND status != 'cancelled'`).get(today) as any).c;

  // Bookings per day (last 7 days)
  const bookingsPerDay = db.prepare(
    `SELECT date(created_at) as day, COUNT(*) as count FROM bookings WHERE created_at >= datetime('now', '-7 days') GROUP BY day ORDER BY day`
  ).all();

  // Department distribution
  const deptStats = db.prepare(
    `SELECT recommended_department, COUNT(*) as count FROM bookings WHERE recommended_department IS NOT NULL GROUP BY recommended_department ORDER BY count DESC`
  ).all();

  // Most recent bookings
  const recentBookings = db.prepare(
    `SELECT b.id, b.symptoms, b.urgency, b.recommended_department, b.appointment_date, b.appointment_time, b.status, b.created_at,
            u.email, u.username
     FROM bookings b JOIN patients p ON b.patient_id = p.id JOIN users u ON p.user_id = u.id
     ORDER BY b.created_at DESC LIMIT 20`
  ).all();

  return res.json({
    ok: true,
    stats: {
      totalPatients,
      totalBookings,
      todayBookings,
      pendingBookings,
      confirmedToday,
    },
    bookingsPerDay,
    deptStats,
    recentBookings,
  });
}

// ---------------------------------------------------------------------------
// GET /api/admin/settings
// ---------------------------------------------------------------------------
export function getSettings(req: Request, res: Response) {
  const rows = db.prepare(`SELECT key, value FROM system_settings`).all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return res.json({ ok: true, settings });
}

// ---------------------------------------------------------------------------
// PUT /api/admin/settings
// ---------------------------------------------------------------------------
const updateSettingsSchema = z.object({
  settings: z.record(z.string(), z.string()),
});

export function updateSettings(req: Request, res: Response) {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }

  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(parsed.data.settings)) {
      db.prepare(`INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)`).run(key, value);
    }
  });
  tx();

  return res.json({ ok: true });
}

// ---------------------------------------------------------------------------
// GET /api/admin/usage — API usage stats
// ---------------------------------------------------------------------------
export function getUsageStats(req: Request, res: Response) {
  const totalUsers = (db.prepare(`SELECT COUNT(*) as c FROM users`).get() as any).c;
  const totalAdmins = (db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'admin'`).get() as any).c;

  // Bookings by month (last 6 months)
  const monthlyBookings = db.prepare(
    `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
     FROM bookings WHERE created_at >= datetime('now', '-6 months')
     GROUP BY month ORDER BY month`
  ).all();

  // Average urgency distribution
  const urgencyStats = db.prepare(
    `SELECT urgency, COUNT(*) as count FROM bookings WHERE urgency IS NOT NULL GROUP BY urgency`
  ).all();

  return res.json({
    ok: true,
    usage: {
      totalUsers,
      totalAdmins,
      totalBookings: (db.prepare(`SELECT COUNT(*) as c FROM bookings`).get() as any).c,
      todayBookings: (db.prepare(`SELECT COUNT(*) as c FROM bookings WHERE date(created_at) = date('now')`).get() as any).c,
    },
    monthlyBookings,
    urgencyStats,
  });
}

// ---------------------------------------------------------------------------
// GET /api/admin/users — list all users with patient info
// ---------------------------------------------------------------------------
export function getUsers(req: Request, res: Response) {
  const search = (req.query.search as string || "").trim();
  let query = `
    SELECT u.id, u.email, u.username, u.phone, u.role, u.created_at, u.last_activity,
           p.first_name_th, p.last_name_th, p.national_id
    FROM users u
    LEFT JOIN patients p ON p.user_id = u.id
  `;
  const params: any[] = [];

  if (search) {
    query += ` WHERE u.email LIKE ? OR u.username LIKE ? OR u.phone LIKE ? OR p.first_name_th LIKE ? OR p.last_name_th LIKE ? OR p.national_id LIKE ?`;
    const like = `%${search}%`;
    params.push(like, like, like, like, like, like);
  }

  query += ` ORDER BY u.created_at DESC LIMIT 200`;

  const users = db.prepare(query).all(...params);
  return res.json({ ok: true, users });
}

// ---------------------------------------------------------------------------
// PUT /api/admin/users/:id — update user info
// ---------------------------------------------------------------------------
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(1).optional(),
  phone: z.string().optional(),
  role: z.enum(["user", "admin"]).optional(),
});

export function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }

  const existing = db.prepare(`SELECT id FROM users WHERE id = ?`).get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: "not_found", message: "ไม่พบบัญชีผู้ใช้" });
  }

  const fields = parsed.data;
  const sets: string[] = [];
  const vals: any[] = [];

  if (fields.email !== undefined) { sets.push("email = ?"); vals.push(fields.email); }
  if (fields.username !== undefined) { sets.push("username = ?"); vals.push(fields.username); }
  if (fields.phone !== undefined) { sets.push("phone = ?"); vals.push(fields.phone); }
  if (fields.role !== undefined) { sets.push("role = ?"); vals.push(fields.role); }

  if (sets.length === 0) {
    return res.status(400).json({ error: "no_fields", message: "ไม่มีข้อมูลที่จะอัปเดต" });
  }

  sets.push("updated_at = datetime('now')");
  vals.push(id);

  db.prepare(`UPDATE users SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`).run(...vals);

  return res.json({ ok: true });
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/users/:id — delete user and related data
// ---------------------------------------------------------------------------
export function deleteUser(req: Request, res: Response) {
  const { id } = req.params;

  const existing = db.prepare(`SELECT id, role FROM users WHERE id = ?`).get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: "not_found", message: "ไม่พบบัญชีผู้ใช้" });
  }
  if (existing.role === "admin") {
    return res.status(403).json({ error: "cannot_delete_admin", message: "ไม่สามารถลบบัญชีแอดมินได้" });
  }

  const tx = db.transaction(() => {
    // Delete related data
    db.prepare(`DELETE FROM emergency_contacts WHERE patient_id IN (SELECT id FROM patients WHERE user_id = ?)`).run(id);
    db.prepare(`DELETE FROM family_members WHERE owner_user_id = ?`).run(id);
    db.prepare(`DELETE FROM bookings WHERE patient_id IN (SELECT id FROM patients WHERE user_id = ?)`).run(id);
    db.prepare(`DELETE FROM lab_results WHERE patient_id IN (SELECT id FROM patients WHERE user_id = ?)`).run(id);
    db.prepare(`DELETE FROM patients WHERE user_id = ?`).run(id);
    db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(id);
    db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
  });
  tx();

  return res.json({ ok: true });
}