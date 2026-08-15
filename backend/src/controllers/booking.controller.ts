import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db } from "../db/db";
import { askFollowUpQuestions, getFinalAnalysis } from "../utils/ai.service";
import { sendBookingConfirmationEmail, sendAppointmentEmail } from "../utils/mail";
import { generateBookingTicketPdf, generateAppointmentPdf } from "../utils/pdf";

// requireAuth already ran - req.patientId comes from the session, never from
// the client.

function checkPdpa(req: Request, res: Response): boolean {
  const patient = db.prepare(`SELECT pdpa_consent FROM patients WHERE id = ?`).get(req.patientId) as any;
  if (!patient?.pdpa_consent) {
    res.status(412).json({ error: "pdpa_consent_required", message: "กรุณายินยอม PDPA ก่อนทำรายการ" });
    return false;
  }
  return true;
}

/** Fetches patient's existing medical history for AI context */
function getPatientMedicalSummary(patientId: string): string {
  const p = db.prepare(
    `SELECT congenital_diseases, drug_food_allergies, blood_type FROM patients WHERE id = ?`
  ).get(patientId) as any;
  if (!p) return "";

  const parts: string[] = [];
  if (p.congenital_diseases) parts.push(`โรคประจำตัว: ${p.congenital_diseases}`);
  if (p.drug_food_allergies) parts.push(`ประวัติการแพ้: ${p.drug_food_allergies}`);
  if (p.blood_type && p.blood_type !== "unknown") parts.push(`หมู่เลือด: ${p.blood_type}`);

  return parts.length > 0
    ? `ข้อมูลสุขภาพที่มีอยู่แล้วในระบบ (ห้ามถามซ้ำ): ${parts.join(" | ")}`
    : "ไม่มีข้อมูลโรคประจำตัวหรือประวัติการแพ้ในระบบ";
}

// ---------------------------------------------------------------------------
// POST /api/booking/analyze
// Body: { symptoms: string } + multipart image (optional)
// Returns: { questions: string[] } — AI returns 5 questions
// ---------------------------------------------------------------------------
export async function analyzeSymptoms(req: Request, res: Response) {
  if (!req.patientId) return res.status(404).json({ error: "no_patient_record" });
  if (!checkPdpa(req, res)) return;

  const parsed = z.object({ symptoms: z.string().min(1, "กรุณากรอกอาการ") }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }

  const { symptoms } = parsed.data;
  const medicalSummary = getPatientMedicalSummary(req.patientId);
  let imageBase64: string | undefined;

  if (req.file) {
    imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  }

  try {
    const result = await askFollowUpQuestions(symptoms, medicalSummary, imageBase64);
    return res.json({ ok: true, questions: result.questions });
  } catch (err: any) {
    console.error("AI analyze error:", err);
    return res.status(500).json({ error: "ai_error", message: "ไม่สามารถวิเคราะห์อาการได้ในขณะนี้" });
  }
}

// ---------------------------------------------------------------------------
// POST /api/booking/analyze-followup
// Body: { symptoms: string, answers: string[], imageBase64?: string }
// Returns: { analysis: {...} }
// ---------------------------------------------------------------------------
export async function analyzeFollowUp(req: Request, res: Response) {
  if (!req.patientId) return res.status(404).json({ error: "no_patient_record" });
  if (!checkPdpa(req, res)) return;

  const schema = z.object({
    symptoms: z.string().min(1),
    answers: z.array(z.string()).min(1),
    imageBase64: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }

  try {
    const medicalSummary = getPatientMedicalSummary(req.patientId);
    const analysis = await getFinalAnalysis(parsed.data.symptoms, parsed.data.answers, medicalSummary, parsed.data.imageBase64);
    return res.json({ ok: true, analysis });
  } catch (err: any) {
    console.error("AI follow-up error:", err);
    return res.status(500).json({ error: "ai_error", message: "ไม่สามารถวิเคราะห์อาการได้ในขณะนี้" });
  }
}

// ---------------------------------------------------------------------------
// POST /api/booking/confirm
// Body: { symptoms, analysis (JSON), imageBase64?, appointmentDate, appointmentTime }
// Saves booking + optional image to DB
// ---------------------------------------------------------------------------
export async function confirmBooking(req: Request, res: Response) {
  if (!req.patientId) return res.status(404).json({ error: "no_patient_record" });
  if (!checkPdpa(req, res)) return;

  const schema = z.object({
    symptoms: z.string().min(1),
    analysis: z.object({
      summary: z.string(),
      recommended_department: z.string(),
      urgency: z.string(),
      urgency_label: z.string(),
      reason: z.string(),
      advice: z.string(),
    }),
    imageBase64: z.string().optional(),
    appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)"),
    appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, "รูปแบบเวลาไม่ถูกต้อง (HH:mm)"),
    // Optional: book on behalf of a family member (sub-account)
    patientId: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }

  const { symptoms, analysis, imageBase64, appointmentDate, appointmentTime } = parsed.data;

  // Resolve target patient: self (default) or a verified family member
  let targetPatientId = req.patientId;
  if (parsed.data.patientId && parsed.data.patientId !== req.patientId) {
    const ok = db
      .prepare(
        `SELECT 1 FROM family_members WHERE owner_user_id = ? AND patient_id = ?`
      )
      .get(req.userId, parsed.data.patientId);
    if (!ok) {
      return res.status(403).json({ error: "forbidden", message: "ไม่มีสิทธิ์จองให้บุคคลนี้" });
    }
    targetPatientId = parsed.data.patientId;
  }

  const bookingId = uuid();

  // Check slot is still available
  const existing = db.prepare(
    `SELECT id FROM bookings WHERE appointment_date = ? AND appointment_time = ? AND status != 'cancelled'`
  ).get(appointmentDate, appointmentTime);
  if (existing) {
    return res.status(409).json({ error: "slot_taken", message: "เวลานี้ถูกจองแล้ว กรุณาเลือกเวลาอื่น" });
  }

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO bookings (id, patient_id, symptoms, urgency, recommended_department, ai_recommendation, appointment_date, appointment_time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`
    ).run(bookingId, targetPatientId, symptoms, analysis.urgency, analysis.recommended_department, JSON.stringify(analysis), appointmentDate, appointmentTime);

    // Save image if provided
    if (imageBase64) {
      const matches = imageBase64.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        db.prepare(
          `INSERT INTO symptom_images (id, booking_id, image_data, mime_type) VALUES (?, ?, ?, ?)`
        ).run(uuid(), bookingId, buffer, mimeType);
      }
    }
  });

  tx();

  const booking = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(bookingId);

  // Send confirmation email with PDF ticket + appointment notification (best-effort)
  try {
    const patient = db.prepare(
      `SELECT p.prefix_th, p.first_name_th, p.last_name_th, u.email, u.full_name
       FROM patients p JOIN users u ON p.user_id = u.id WHERE p.id = ?`
    ).get(targetPatientId) as any;
    if (patient?.email) {
      const patientName = patient.full_name || `${patient.prefix_th || ""}${patient.first_name_th || ""} ${patient.last_name_th || ""}`.trim();
      const dept = analysis.recommended_department;
      const queueNumber = bookingId.slice(0, 8).toUpperCase();

      // Booking ticket PDF
      const ticketPdf = await generateBookingTicketPdf({
        patientName,
        queueNumber,
        department: dept,
        appointmentDate,
        appointmentTime,
        urgency: analysis.urgency,
        symptoms,
      });
      await sendBookingConfirmationEmail(patient.email, {
        patientName,
        queueNumber,
        department: dept,
        appointmentDate,
        appointmentTime,
        urgency: analysis.urgency,
      }, ticketPdf);

      // Appointment notification PDF
      const apptPdf = await generateAppointmentPdf({
        patientName,
        department: dept,
        appointmentDate,
        appointmentTime,
        note: null,
      });
      await sendAppointmentEmail(patient.email, {
        patientName,
        department: dept,
        appointmentDate,
        appointmentTime,
        note: null,
      }, apptPdf);
    }
  } catch (mailErr) {
    console.error("[BOOKING] email notify failed:", mailErr);
  }

  return res.status(201).json({ ok: true, booking });
}

// ---------------------------------------------------------------------------
// GET /api/booking/available-slots?date=YYYY-MM-DD
// Returns: { maxQueuePerHour, slots: { time, count, full }[] }
// ---------------------------------------------------------------------------
const BUSINESS_HOURS = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30"];

export function getAvailableSlots(req: Request, res: Response) {
  const date = req.query.date as string;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "invalid_date", message: "รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)" });
  }

  // Max queue per hour from settings (default 16)
  const maxRow = db.prepare(`SELECT value FROM system_settings WHERE key = 'max_queue_per_hour'`).get() as
    | { value: string }
    | undefined;
  const maxQueuePerHour = maxRow ? Number(maxRow.value) || 16 : 16;

  // Count bookings per hour for this date
  const counts = db
    .prepare(
      `SELECT substr(appointment_time, 1, 2) as hour, COUNT(*) as c
       FROM bookings WHERE appointment_date = ? AND status != 'cancelled'
       GROUP BY hour`
    )
    .all(date) as { hour: string; c: number }[];

  const countByHour: Record<string, number> = {};
  for (const row of counts) countByHour[row.hour] = row.c;

  // เวลาปัจจุบันในประเทศไทย
  const now = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
  const currentHour = now.getUTCHours(); // ใช้ UTC เพราะเรา +7 ไปแล้ว
  const currentMinute = now.getUTCMinutes();
  const currentTimeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;
  const isToday = date === now.toISOString().split("T")[0];

  // Build slot list with count + full flag + passed flag
  const slots = BUSINESS_HOURS.map((time) => {
    const hour = time.split(":")[0];
    const count = countByHour[hour] || 0;
    // ถ้าเป็นวันนี้และเลยเวลาแล้ว ให้ปิดไม่ให้จอง
    const passed = isToday && time < currentTimeStr;
    return { time, count, full: count >= maxQueuePerHour || passed, passed };
  });

  return res.json({ ok: true, maxQueuePerHour, slots });
}

// ---------------------------------------------------------------------------
// POST /api/admin/bookings/create   (staff creates booking for patient)
// Requires admin session (requireAdmin sets req.userId but NOT req.patientId)
// Body: { patientId, symptoms, appointmentDate, appointmentTime,
//         urgency?, recommendedDepartment?, note? }
// ---------------------------------------------------------------------------
const staffBookingSchema = z.object({
  patientId: z.string().min(1, "กรุณาเลือกคนไข้"),
  symptoms: z.string().min(1, "กรุณากรอกอาการ"),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)"),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, "รูปแบบเวลาไม่ถูกต้อง (HH:mm)"),
  urgency: z.enum(["emergency", "urgent", "routine", "non_urgent"]).optional(),
  recommendedDepartment: z.string().optional(),
  note: z.string().optional(),
});

export async function staffCreateBooking(req: Request, res: Response) {
  const parsed = staffBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }

  const { patientId, symptoms, appointmentDate, appointmentTime, urgency, recommendedDepartment, note } = parsed.data;

  // Verify patient exists
  const patient = db.prepare(`SELECT id FROM patients WHERE id = ?`).get(patientId) as any;
  if (!patient) {
    return res.status(404).json({ error: "patient_not_found", message: "ไม่พบข้อมูลคนไข้" });
  }

  // Check slot is still available
  const existing = db.prepare(
    `SELECT id FROM bookings WHERE appointment_date = ? AND appointment_time = ? AND status != 'cancelled'`
  ).get(appointmentDate, appointmentTime);
  if (existing) {
    return res.status(409).json({ error: "slot_taken", message: "เวลานี้ถูกจองแล้ว กรุณาเลือกเวลาอื่น" });
  }

  const bookingId = uuid();

  db.prepare(
    `INSERT INTO bookings (id, patient_id, symptoms, urgency, recommended_department, appointment_date, appointment_time, note, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`
  ).run(bookingId, patientId, symptoms, urgency || "routine", recommendedDepartment || null, appointmentDate, appointmentTime, note || null);

  const booking = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(bookingId);

  // Send confirmation email with PDF ticket (best-effort)
  try {
    const patientInfo = db.prepare(
      `SELECT p.prefix_th, p.first_name_th, p.last_name_th, u.email, u.full_name
       FROM patients p JOIN users u ON p.user_id = u.id WHERE p.id = ?`
    ).get(patientId) as any;
    if (patientInfo?.email) {
      const patientName = patientInfo.full_name || `${patientInfo.prefix_th || ""}${patientInfo.first_name_th || ""} ${patientInfo.last_name_th || ""}`.trim();
      const dept = recommendedDepartment || "ทั่วไป";
      const queueNumber = bookingId.slice(0, 8).toUpperCase();

      // Booking ticket PDF
      const ticketPdf = await generateBookingTicketPdf({
        patientName,
        queueNumber,
        department: dept,
        appointmentDate,
        appointmentTime,
        urgency: urgency || "routine",
        symptoms,
      });
      await sendBookingConfirmationEmail(patientInfo.email, {
        patientName,
        queueNumber,
        department: dept,
        appointmentDate,
        appointmentTime,
        urgency: urgency || "routine",
      }, ticketPdf);

      // Appointment notification PDF
      const apptPdf = await generateAppointmentPdf({
        patientName,
        department: dept,
        appointmentDate,
        appointmentTime,
        note: note || null,
      });
      await sendAppointmentEmail(patientInfo.email, {
        patientName,
        department: dept,
        appointmentDate,
        appointmentTime,
        note: note || null,
      }, apptPdf);
    }
  } catch (mailErr) {
    console.error("[STAFF BOOKING] email notify failed:", mailErr);
  }

  return res.status(201).json({ ok: true, booking });
}

// ---------------------------------------------------------------------------
// GET /api/booking/history
// ---------------------------------------------------------------------------
export function getBookingHistory(req: Request, res: Response) {
  if (!req.patientId) return res.status(404).json({ error: "no_patient_record" });

  const bookings = db
    .prepare(`SELECT * FROM bookings WHERE patient_id = ? ORDER BY created_at DESC`)
    .all(req.patientId);

  return res.json({ ok: true, bookings });
}

// ---------------------------------------------------------------------------
// GET /api/booking/appointments — upcoming (future) appointments
// แสดงนัดหมายที่หมอ/เจ้าหน้าที่กำหนดไว้ (วันนัดยังไม่ผ่าน, ไม่ถูกยกเลิก)
// ---------------------------------------------------------------------------
export function getUpcomingAppointments(req: Request, res: Response) {
  if (!req.patientId) return res.status(404).json({ error: "no_patient_record" });

  const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split("T")[0];

  const appointments = db
    .prepare(
      `SELECT * FROM bookings
       WHERE patient_id = ? AND appointment_date >= ? AND status != 'cancelled'
       ORDER BY appointment_date ASC, appointment_time ASC`
    )
    .all(req.patientId, today);

  return res.json({ ok: true, appointments });
}

// ---------------------------------------------------------------------------
// POST /api/booking/appointments/:id/read — mark appointment as read
// ---------------------------------------------------------------------------
export function markAppointmentRead(req: Request, res: Response) {
  if (!req.patientId) return res.status(404).json({ error: "no_patient_record" });

  const { id } = req.params;
  const booking = db
    .prepare(`SELECT id FROM bookings WHERE id = ? AND patient_id = ?`)
    .get(id, req.patientId) as any;
  if (!booking) {
    return res.status(404).json({ error: "not_found", message: "ไม่พบนัดหมายนี้" });
  }

  db.prepare(`UPDATE bookings SET is_read = 1 WHERE id = ?`).run(id);
  return res.json({ ok: true });
}
