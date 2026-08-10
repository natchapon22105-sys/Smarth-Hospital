import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import { db } from "../db/db";
import { sendOtpEmail } from "./mail";

const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 5);
const MAX_ATTEMPTS = 5;

function randomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

/**
 * Generates an OTP, stores its hash, and sends it to the given email.
 * Falls back to console.log if SMTP is not configured.
 */
export async function issueOtp(
  phone: string,
  email: string,
  purpose: "register" | "login" | "password_reset"
): Promise<void> {
  const code = randomCode();
  const codeHash = bcrypt.hashSync(code, 8);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  db.prepare(
    `INSERT INTO otp_codes (id, phone, code_hash, purpose, expires_at) VALUES (?, ?, ?, ?, ?)`
  ).run(uuid(), phone, codeHash, purpose, expiresAt);

  await sendOtpEmail(email, code, purpose);
}

export function verifyOtpCode(
  phone: string,
  code: string,
  purpose: "register" | "login" | "password_reset"
): { ok: true } | { ok: false; reason: string } {
  const row = db
    .prepare(
      `SELECT * FROM otp_codes
       WHERE phone = ? AND purpose = ? AND verified = 0
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(phone, purpose) as any;

  if (!row) return { ok: false, reason: "no_pending_otp" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };

  const matches = bcrypt.compareSync(code, row.code_hash);
  db.prepare(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?`).run(row.id);

  if (!matches) return { ok: false, reason: "incorrect_code" };

  db.prepare(`UPDATE otp_codes SET verified = 1 WHERE id = ?`).run(row.id);
  return { ok: true };
}

/** Issues a short-lived token proving `phone` passed OTP, to be consumed at final registration. */
export function issueOtpToken(phone: string): string {
  const token = uuid();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min to finish signup
  db.prepare(
    `INSERT INTO otp_tokens (token, phone, expires_at) VALUES (?, ?, ?)`
  ).run(token, phone, expiresAt);
  return token;
}

export function consumeOtpToken(token: string, phone: string): boolean {
  const row = db.prepare(`SELECT * FROM otp_tokens WHERE token = ?`).get(token) as any;
  if (!row) return false;
  if (row.used) return false;
  if (row.phone !== phone) return false;
  if (new Date(row.expires_at).getTime() < Date.now()) return false;
  db.prepare(`UPDATE otp_tokens SET used = 1 WHERE token = ?`).run(token);
  return true;
}
