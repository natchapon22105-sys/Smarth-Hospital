import { Request, Response, NextFunction } from "express";
import { db } from "../db/db";
import { COOKIE_NAME, getSession } from "../utils/session";

export function requireNurse(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.[COOKIE_NAME];
  if (!sessionId) {
    return res.status(401).json({ error: "unauthorized", message: "No active session." });
  }

  const session = getSession(sessionId);
  if (!session) {
    return res.status(401).json({ error: "unauthorized", message: "Session expired or invalid." });
  }

  const user = db.prepare(`SELECT role FROM users WHERE id = ?`).get(session.user_id) as any;
  if (!user || (user.role !== "nurse" && user.role !== "admin")) {
    return res.status(403).json({ error: "forbidden", message: "Nurse or Admin access required." });
  }

  req.userId = session.user_id;
  next();
}