import { Request, Response, NextFunction } from "express";
import { db } from "../db/db";
import { COOKIE_NAME, getSession } from "../utils/session";

/**
 * requireAuth
 *
 * Reads the httpOnly session cookie, looks the session up server-side, and
 * attaches req.userId + req.patientId. Every patient-data route (booking,
 * history, symptom-check, profile, etc.) MUST use these values instead of
 * trusting a patientId sent by the client - this is the fix for the
 * previously-flagged vulnerability where patientId came straight from the
 * request body/query.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.[COOKIE_NAME];
  if (!sessionId) {
    return res.status(401).json({ error: "unauthorized", message: "No active session." });
  }

  const session = getSession(sessionId);
  if (!session) {
    return res.status(401).json({ error: "unauthorized", message: "Session expired or invalid." });
  }

  const patient = db
    .prepare(`SELECT id FROM patients WHERE user_id = ?`)
    .get(session.user_id) as { id: string } | undefined;

  req.userId = session.user_id;
  req.patientId = patient?.id;
  next();
}
