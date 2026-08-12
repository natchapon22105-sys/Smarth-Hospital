import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "../db/db";
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
  const today = new Date().toISOString().split("T")[0];

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