import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db } from "../db/db";
import { askFollowUpQuestions, getFinalAnalysis } from "../utils/ai.service";

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
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }

  const { symptoms, analysis, imageBase64, appointmentDate, appointmentTime } = parsed.data;
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
    ).run(bookingId, req.patientId, symptoms, analysis.urgency, analysis.recommended_department, JSON.stringify(analysis), appointmentDate, appointmentTime);

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
  return res.status(201).json({ ok: true, booking });
}

// ---------------------------------------------------------------------------
// GET /api/booking/available-slots?date=YYYY-MM-DD
// Returns: { slots: string[] } — list of available times (HH:mm)
// ---------------------------------------------------------------------------
const BUSINESS_HOURS = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30"];

export function getAvailableSlots(req: Request, res: Response) {
  if (!req.patientId) return res.status(404).json({ error: "no_patient_record" });

  const date = req.query.date as string;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "invalid_date", message: "รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)" });
  }

  // Get all booked slots for this date
  const booked = db.prepare(
    `SELECT appointment_time FROM bookings WHERE appointment_date = ? AND status != 'cancelled'`
  ).all(date) as { appointment_time: string }[];

  const bookedTimes = new Set(booked.map((b) => b.appointment_time));
  const available = BUSINESS_HOURS.filter((t) => !bookedTimes.has(t));

  return res.json({ ok: true, slots: available });
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
