import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "../db/db";
import { createSession, setSessionCookie } from "../utils/session";

function logActivity(nurseId: string, action: string, details?: string) {
  db.prepare(
    `INSERT INTO nurse_activity_log (id, nurse_id, action, details) VALUES (?, ?, ?, ?)`
  ).run(uuid(), nurseId, action, details ?? null);
}

// ---------------------------------------------------------------------------
// POST /api/nurse-auth/register
// ---------------------------------------------------------------------------
export async function registerNurse(req: Request, res: Response) {
  try {
    const schema = z.object({
      email: z.string().email(),
      username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_.]+$/),
      password: z.string().min(8),
      fullName: z.string().min(1).max(100),
      phone: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    }

    const { email, username, password, fullName, phone } = parsed.data;

    const existing = db.prepare(
      `SELECT id FROM nurse_registrations WHERE email = ? OR username = ?`
    ).get(email, username);
    if (existing) {
      return res.status(409).json({ error: "already_exists", message: "อีเมลหรือชื่อผู้ใช้นี้ถูกใช้แล้ว" });
    }

    const existingUser = db.prepare(
      `SELECT id FROM users WHERE email = ? OR username = ?`
    ).get(email, username);
    if (existingUser) {
      return res.status(409).json({ error: "already_exists", message: "อีเมลหรือชื่อผู้ใช้นี้ถูกใช้แล้ว" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuid();

    db.prepare(
      `INSERT INTO nurse_registrations (id, email, username, password_hash, full_name, phone, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`
    ).run(id, email, username, passwordHash, fullName, phone ?? null);

    return res.status(201).json({
      ok: true,
      message: "ลงทะเบียนสำเร็จ รอผู้ดูแลระบบอนุมัติ",
    });
  } catch (err) {
    console.error("registerNurse error:", err);
    return res.status(500).json({ error: "server_error", message: "ลงทะเบียนไม่สำเร็จ" });
  }
}

// ---------------------------------------------------------------------------
// POST /api/nurse-auth/login
// ---------------------------------------------------------------------------
export async function loginNurse(req: Request, res: Response) {
  try {
    const schema = z.object({
      identifier: z.string().min(1),
      password: z.string().min(1),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_input" });
    }

    const { identifier, password } = parsed.data;

    const user = db.prepare(
      `SELECT * FROM users WHERE (email = ? OR username = ?) AND role = 'nurse'`
    ).get(identifier, identifier) as any;

    if (!user) {
      return res.status(401).json({ error: "invalid_credentials", message: "ไม่พบบัญชีพยาบาล หรือยังไม่ได้รับการอนุมัติ" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "invalid_credentials", message: "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง" });
    }

    // Update last_activity
    db.prepare(`UPDATE users SET last_activity = datetime('now') WHERE id = ?`).run(user.id);
    logActivity(user.id, "login");

    const session = createSession(user.id);
    setSessionCookie(res, session.id);

    return res.json({
      ok: true,
      user: { id: user.id, email: user.email, username: user.username, fullName: user.full_name },
    });
  } catch (err) {
    console.error("loginNurse error:", err);
    return res.status(500).json({ error: "server_error", message: "เข้าสู่ระบบไม่สำเร็จ" });
  }
}

// ---------------------------------------------------------------------------
// GET /api/nurse-auth/pending (admin only)
// ---------------------------------------------------------------------------
export function getPendingNurses(req: Request, res: Response) {
  const nurses = db.prepare(
    `SELECT id, email, username, full_name, phone, status, created_at
     FROM nurse_registrations WHERE status = 'pending'
     ORDER BY created_at ASC`
  ).all();

  return res.json({ ok: true, nurses });
}

// ---------------------------------------------------------------------------
// GET /api/nurse-auth/all (admin only) — includes online status
// ---------------------------------------------------------------------------
export function getAllNurses(req: Request, res: Response) {
  const nurses = db.prepare(
    `SELECT n.id, n.email, n.username, n.full_name, n.phone, n.status, n.created_at, n.approved_at,
            u.last_activity, u.id as user_id
     FROM nurse_registrations n
     LEFT JOIN users u ON n.email = u.email AND u.role = 'nurse'
     ORDER BY n.created_at DESC`
  ).all() as any[];

  // Get activity counts
  const nursesWithActivity = nurses.map((n) => {
    let isOnline = false;
    if (n.last_activity) {
      const lastActivity = new Date(n.last_activity).getTime();
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      isOnline = lastActivity > fiveMinutesAgo;
    }

    // Count actions today
    const todayActions = n.user_id
      ? (db.prepare(
          `SELECT COUNT(*) as c FROM nurse_activity_log WHERE nurse_id = ? AND date(created_at) = date('now')`
        ).get(n.user_id) as any).c
      : 0;

    return {
      ...n,
      isOnline,
      todayActions,
    };
  });

  return res.json({ ok: true, nurses: nursesWithActivity });
}

// ---------------------------------------------------------------------------
// POST /api/nurse-auth/approve/:id (admin only)
// ---------------------------------------------------------------------------
export async function approveNurse(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const reg = db.prepare(`SELECT * FROM nurse_registrations WHERE id = ?`).get(id) as any;
    if (!reg) {
      return res.status(404).json({ error: "not_found", message: "ไม่พบคำขอ" });
    }
    if (reg.status !== "pending") {
      return res.status(400).json({ error: "already_processed", message: "คำขอนี้ได้รับการดำเนินการแล้ว" });
    }

    const userId = uuid();
    const patientId = uuid();

    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO users (id, email, username, phone, password_hash, role, full_name)
         VALUES (?, ?, ?, ?, ?, 'nurse', ?)`
      ).run(userId, reg.email, reg.username, reg.phone ?? "", reg.password_hash, reg.full_name);

      db.prepare(`INSERT INTO patients (id, user_id) VALUES (?, ?)`).run(patientId, userId);

      db.prepare(
        `UPDATE nurse_registrations SET status = 'approved', approved_at = datetime('now'), approved_by = ? WHERE id = ?`
      ).run(req.userId, id);
    });

    tx();

    return res.json({ ok: true, message: "อนุมัติพยาบาลสำเร็จ" });
  } catch (err) {
    console.error("approveNurse error:", err);
    return res.status(500).json({ error: "server_error", message: "อนุมัติไม่สำเร็จ" });
  }
}

// ---------------------------------------------------------------------------
// POST /api/nurse-auth/reject/:id (admin only)
// ---------------------------------------------------------------------------
export function rejectNurse(req: Request, res: Response) {
  const { id } = req.params;

  const reg = db.prepare(`SELECT * FROM nurse_registrations WHERE id = ?`).get(id) as any;
  if (!reg) {
    return res.status(404).json({ error: "not_found", message: "ไม่พบคำขอ" });
  }

  db.prepare(`UPDATE nurse_registrations SET status = 'rejected' WHERE id = ?`).run(id);

  return res.json({ ok: true, message: "ปฏิเสธคำขอแล้ว" });
}

// ---------------------------------------------------------------------------
// DELETE /api/nurse-auth/delete/:id (admin only) — deletes user + registration
// ---------------------------------------------------------------------------
export function deleteNurse(req: Request, res: Response) {
  const { id } = req.params;

  const reg = db.prepare(`SELECT * FROM nurse_registrations WHERE id = ?`).get(id) as any;
  if (!reg) {
    return res.status(404).json({ error: "not_found", message: "ไม่พบคำขอ" });
  }

  // Find and delete the user if exists
  const user = db.prepare(`SELECT id FROM users WHERE email = ? AND role = 'nurse'`).get(reg.email) as any;

  const tx = db.transaction(() => {
    if (user) {
      db.prepare(`DELETE FROM nurse_activity_log WHERE nurse_id = ?`).run(user.id);
      db.prepare(`DELETE FROM users WHERE id = ?`).run(user.id);
    }
    db.prepare(`DELETE FROM nurse_registrations WHERE id = ?`).run(id);
  });

  tx();

  return res.json({ ok: true, message: "ลบพยาบาลสำเร็จ" });
}

// ---------------------------------------------------------------------------
// GET /api/nurse-auth/activity/:id (admin only)
// ---------------------------------------------------------------------------
export function getNurseActivity(req: Request, res: Response) {
  const { id } = req.params;

  // Find user_id from nurse_registrations or directly
  const user = db.prepare(`SELECT id FROM users WHERE id = ? AND role = 'nurse'`).get(id) as any;
  const nurseId = user ? user.id : id;

  const activities = db.prepare(
    `SELECT * FROM nurse_activity_log WHERE nurse_id = ? ORDER BY created_at DESC LIMIT 50`
  ).all(nurseId);

  return res.json({ ok: true, activities });
}