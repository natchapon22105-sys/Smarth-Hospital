import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db/db";

function touchNurseActivity(userId: string) {
  db.prepare(`UPDATE users SET last_activity = datetime('now') WHERE id = ?`).run(userId);
}

function logActivity(nurseId: string, action: string, details?: string) {
  db.prepare(
    `INSERT INTO nurse_activity_log (id, nurse_id, action, details) VALUES (?, ?, ?, ?)`
  ).run(uuid(), nurseId, action, details ?? null);
}

// ---------------------------------------------------------------------------
// GET /api/nurse/queue?date=YYYY-MM-DD
// Returns all bookings for a given date, ordered by time
// ---------------------------------------------------------------------------
export function getQueueByDate(req: Request, res: Response) {
  const date = (req.query.date as string) || new Date().toISOString().split("T")[0];

  const bookings = db
    .prepare(
      `SELECT
        b.id,
        b.appointment_time,
        b.symptoms,
        b.urgency,
        b.recommended_department,
        b.status,
        b.created_at,
        u.username,
        u.email,
        u.phone,
        p.prefix_th,
        p.first_name_th,
        p.last_name_th,
        p.national_id
      FROM bookings b
      JOIN patients p ON b.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE b.appointment_date = ?
      ORDER BY b.appointment_time ASC`
    )
    .all(date);

  // Stats for the day
  const total = bookings.length;
  const checkedIn = bookings.filter((b: any) => b.status === "confirmed").length;
  const completed = bookings.filter((b: any) => b.status === "completed").length;
  const cancelled = bookings.filter((b: any) => b.status === "cancelled").length;
  const pending = bookings.filter((b: any) => b.status === "pending").length;

  // Urgency breakdown
  const emergency = bookings.filter((b: any) => b.urgency === "emergency").length;
  const urgent = bookings.filter((b: any) => b.urgency === "urgent").length;

  return res.json({
    ok: true,
    date,
    stats: { total, checkedIn, completed, cancelled, pending, emergency, urgent },
    bookings,
  });
}

// ---------------------------------------------------------------------------
// PUT /api/nurse/queue/:id/status
// Body: { status: "confirmed" | "completed" | "cancelled" }
// ---------------------------------------------------------------------------
export function updateBookingStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;

  if (!["confirmed", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "invalid_status" });
  }

  const booking = db.prepare(`SELECT id, appointment_time, patient_id FROM bookings WHERE id = ?`).get(id) as any;
  if (!booking) {
    return res.status(404).json({ error: "not_found", message: "ไม่พบรายการนัด" });
  }

  db.prepare(`UPDATE bookings SET status = ? WHERE id = ?`).run(status, id);

  // Track nurse activity
  const nurseId = req.userId as string;
  touchNurseActivity(nurseId);
  logActivity(nurseId, "booking_status", `เปลี่ยนสถานะการจอง #${id} เป็น ${status}`);

  return res.json({ ok: true });
}