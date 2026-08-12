import { v4 as uuid } from "uuid";
import { Response } from "express";
import { db } from "../db/db";

const COOKIE_NAME = process.env.COOKIE_NAME || "nudmedi_session";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";
const TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 12);
const REMEMBER_TTL_HOURS = Number(process.env.SESSION_REMEMBER_TTL_HOURS || 24 * 30); // 30 days

export { COOKIE_NAME };

export function createSession(userId: string, remember = false): { id: string; expiresAt: string } {
  const ttlHours = remember ? REMEMBER_TTL_HOURS : TTL_HOURS;
  const id = uuid();
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
  db.prepare(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`
  ).run(id, userId, expiresAt);
  return { id, expiresAt };
}

export function getSession(sessionId: string):
  | { id: string; user_id: string; expires_at: string }
  | undefined {
  const row = db
    .prepare(`SELECT * FROM sessions WHERE id = ?`)
    .get(sessionId) as any;
  if (!row) return undefined;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    // expired - clean up lazily
    db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId);
    return undefined;
  }
  return row;
}

export function destroySession(sessionId: string) {
  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId);
}

export function setSessionCookie(res: Response, sessionId: string, remember = false) {
  const ttlHours = remember ? REMEMBER_TTL_HOURS : TTL_HOURS;
  res.cookie(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: COOKIE_SECURE, // must be true in production (HTTPS)
    sameSite: COOKIE_SECURE ? "none" : "lax",
    maxAge: ttlHours * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}
