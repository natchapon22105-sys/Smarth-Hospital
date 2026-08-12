import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "../db/db";
import { hashPassword, verifyPassword } from "../utils/password";
import { issueOtp, verifyOtpCode, issueOtpToken, consumeOtpToken } from "../utils/otp";
import { sendOtpEmail } from "../utils/mail";
import { createSession, setSessionCookie, clearSessionCookie, destroySession, COOKIE_NAME } from "../utils/session";

const phoneSchema = z.string().regex(/^0[0-9]{9}$/, "เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0");
const emailSchema = z.string().email("อีเมลไม่ถูกต้อง");

// ---------------------------------------------------------------------------
// POST /api/auth/register/request-otp   { email, phone }
// ---------------------------------------------------------------------------
export async function requestRegisterOtp(req: Request, res: Response) {
  try {
    const parsed = z.object({ email: emailSchema, phone: phoneSchema }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    }
    const { email, phone } = parsed.data;

    const existing = db
      .prepare(`SELECT id FROM users WHERE email = ? OR phone = ?`)
      .get(email, phone);
    if (existing) {
      return res.status(409).json({ error: "already_registered", message: "อีเมลหรือเบอร์โทรนี้ถูกใช้งานแล้ว" });
    }

    await issueOtp(phone, email, "register");
    return res.json({ ok: true, message: "ส่งรหัส OTP แล้ว" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error", message: "ส่ง OTP ไม่สำเร็จ" });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/register/verify-otp   { phone, code }
// ---------------------------------------------------------------------------
export function verifyRegisterOtp(req: Request, res: Response) {
  const parsed = z.object({ phone: phoneSchema, code: z.string().length(6) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }
  const { phone, code } = parsed.data;

  const result = verifyOtpCode(phone, code, "register");
  if (!result.ok) {
    return res.status(400).json({ error: "otp_failed", reason: result.reason });
  }

  const otpToken = issueOtpToken(phone);
  return res.json({ ok: true, otpToken });
}

// ---------------------------------------------------------------------------
// POST /api/auth/register   { email, username, phone, otpToken, password }
// ---------------------------------------------------------------------------
export async function register(req: Request, res: Response) {
  const schema = z.object({
    email: emailSchema,
    username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_.]+$/, "ใช้ได้เฉพาะตัวอักษร ตัวเลข . และ _"),
    phone: phoneSchema,
    otpToken: z.string().uuid(),
    password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }
  const { email, username, phone, otpToken, password } = parsed.data;

  if (!consumeOtpToken(otpToken, phone)) {
    return res.status(400).json({ error: "otp_token_invalid", message: "ยืนยัน OTP ใหม่อีกครั้ง" });
  }

  const existing = db
    .prepare(`SELECT id FROM users WHERE email = ? OR username = ? OR phone = ?`)
    .get(email, username, phone);
  if (existing) {
    return res.status(409).json({ error: "already_registered" });
  }

  const passwordHash = await hashPassword(password);
  const userId = uuid();
  const patientId = uuid();

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO users (id, email, username, phone, phone_verified, password_hash)
       VALUES (?, ?, ?, ?, 1, ?)`
    ).run(userId, email, username, phone, passwordHash);

    // Empty patient shell - filled in later via the intake form.
    db.prepare(`INSERT INTO patients (id, user_id) VALUES (?, ?)`).run(patientId, userId);
  });
  tx();

  const session = createSession(userId);
  setSessionCookie(res, session.id);

  return res.status(201).json({
    ok: true,
    user: { id: userId, email, username, phone },
  });
}

// ---------------------------------------------------------------------------
// POST /api/auth/login   { identifier, password }   identifier = email or username
// ---------------------------------------------------------------------------
export async function login(req: Request, res: Response) {
  const schema = z.object({ identifier: z.string().min(1), password: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input" });
  }
  const { identifier, password } = parsed.data;

  const user = db
    .prepare(`SELECT * FROM users WHERE email = ? OR username = ?`)
    .get(identifier, identifier) as any;

  // Same error for "no user" and "wrong password" - don't leak which one it was.
  const invalid = () => res.status(401).json({ error: "invalid_credentials", message: "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง" });

  if (!user) return invalid();
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return invalid();

  const session = createSession(user.id);
  setSessionCookie(res, session.id);

  return res.json({
    ok: true,
    user: { id: user.id, email: user.email, username: user.username, phone: user.phone },
  });
}

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
export function logout(req: Request, res: Response) {
  const sessionId = req.cookies?.[COOKIE_NAME];
  if (sessionId) destroySession(sessionId);
  clearSessionCookie(res);
  return res.json({ ok: true });
}

// ---------------------------------------------------------------------------
// GET /api/auth/me   (requireAuth)
// ---------------------------------------------------------------------------
export function me(req: Request, res: Response) {
  const user = db.prepare(`SELECT id, email, username, phone, role FROM users WHERE id = ?`).get(req.userId) as any;
  if (!user) return res.status(404).json({ error: "not_found" });
  const patient = req.patientId
    ? db.prepare(`SELECT prefix_th, first_name_th, last_name_th, national_id, profile_image FROM patients WHERE id = ?`).get(req.patientId) as any
    : null;
  return res.json({
    ok: true,
    user: { id: user.id, email: user.email, username: user.username, phone: user.phone, role: user.role },
    patientId: req.patientId,
    patient: patient
      ? {
          prefix_th: patient.prefix_th,
          first_name_th: patient.first_name_th,
          last_name_th: patient.last_name_th,
          national_id: patient.national_id,
          profile_image: patient.profile_image,
        }
      : null,
  });
}

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password   { email }
// Sends OTP to the user's email for password reset
// ---------------------------------------------------------------------------
export async function forgotPassword(req: Request, res: Response) {
  try {
    const parsed = z.object({ email: emailSchema }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    }

    const { email } = parsed.data;
    const user = db.prepare(`SELECT id, email, phone FROM users WHERE email = ?`).get(email) as any;

    // Don't reveal if email exists — always return success
    if (!user) {
      return res.json({ ok: true, message: "หากอีเมลนี้มีในระบบ รหัส OTP จะถูกส่งไป" });
    }

    // Generate OTP for password reset
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = bcrypt.hashSync(code, 8);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    db.prepare(
      `INSERT INTO otp_codes (id, phone, code_hash, purpose, expires_at) VALUES (?, ?, ?, ?, ?)`
    ).run(uuid(), user.phone, codeHash, "password_reset", expiresAt);

    // Send OTP via email (purpose must match what is stored + verified)
    try {
      await sendOtpEmail(email, code, "password_reset");
    } catch (mailErr) {
      console.error("forgotPassword sendOtpEmail failed:", mailErr);
      return res.status(500).json({ error: "email_send_failed", message: "ไม่สามารถส่งอีเมล OTP ได้ กรุณาลองใหม่หรือติดต่อผู้ดูแล" });
    }

    return res.json({ ok: true, message: "หากอีเมลนี้มีในระบบ รหัส OTP จะถูกส่งไป" });
  } catch (err) {
    console.error("forgotPassword error:", err);
    return res.status(500).json({ error: "server_error", message: "ไม่สามารถส่ง OTP ได้" });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password   { email, code, newPassword }
// Verifies OTP and updates password
// ---------------------------------------------------------------------------
export async function resetPassword(req: Request, res: Response) {
  try {
    const parsed = z.object({
      email: emailSchema,
      code: z.string().length(6),
      newPassword: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
    }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    }

    const { email, code, newPassword } = parsed.data;
    const user = db.prepare(`SELECT id, phone FROM users WHERE email = ?`).get(email) as any;
    if (!user) {
      return res.status(400).json({ error: "reset_failed", message: "ไม่สามารถรีเซ็ตรหัสผ่านได้" });
    }

    // Verify OTP
    const result = verifyOtpCode(user.phone, code, "password_reset");
    if (!result.ok) {
      return res.status(400).json({ error: "otp_failed", reason: result.reason });
    }

    // Update password
    const passwordHash = await hashPassword(newPassword);
    db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(passwordHash, user.id);

    return res.json({ ok: true, message: "รีเซ็ตรหัสผ่านสำเร็จ" });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({ error: "server_error", message: "ไม่สามารถรีเซ็ตรหัสผ่านได้" });
  }
}
