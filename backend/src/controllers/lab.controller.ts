import { Request, Response } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { db } from "../db/db";
import { sendLabResultEmail } from "../utils/mail";

// requireAuth already ran - req.patientId comes from the session, never from
// the client.

// ---------------------------------------------------------------------------
// GET /api/lab/results
// Returns: { results: LabResult[] } — lab results for the current patient,
// ordered by test_date DESC then created_at DESC.
// ---------------------------------------------------------------------------
export function getLabResults(req: Request, res: Response) {
  const patientId = req.patientId;
  if (!patientId) return res.status(404).json({ error: "no_patient_record" });

  const results = db
    .prepare(
      `SELECT * FROM lab_results WHERE patient_id = ? ORDER BY test_date DESC, created_at DESC`
    )
    .all(patientId);

  return res.json({ ok: true, results });
}

// ---------------------------------------------------------------------------
// GET /api/lab/results/:id
// Returns a single lab result with full detail.
// ---------------------------------------------------------------------------
export function getLabResultById(req: Request, res: Response) {
  const patientId = req.patientId;
  if (!patientId) return res.status(404).json({ error: "no_patient_record" });

  const { id } = req.params;
  const result = db
    .prepare(`SELECT * FROM lab_results WHERE id = ? AND patient_id = ?`)
    .get(id, patientId) as any;

  if (!result) {
    return res.status(404).json({ error: "not_found", message: "ไม่พบผลตรวจนี้" });
  }

  return res.json({ ok: true, result });
}

// ---------------------------------------------------------------------------
// POST /api/lab/results/:id/read   (requireAuth)
// Marks a lab result as read by the patient (clears the unread highlight).
// ---------------------------------------------------------------------------
export function markLabResultRead(req: Request, res: Response) {
  const patientId = req.patientId;
  if (!patientId) return res.status(404).json({ error: "no_patient_record" });

  const { id } = req.params;
  const result = db
    .prepare(`SELECT id FROM lab_results WHERE id = ? AND patient_id = ?`)
    .get(id, patientId) as any;
  if (!result) {
    return res.status(404).json({ error: "not_found", message: "ไม่พบผลตรวจนี้" });
  }

  db.prepare(`UPDATE lab_results SET is_read = 1 WHERE id = ?`).run(id);
  return res.json({ ok: true });
}

// ---------------------------------------------------------------------------
// GET /api/lab/patients/search?q=...   (admin / nurse only)
// Search patients by name, national_id, phone or email.
// ---------------------------------------------------------------------------
export function searchPatients(req: Request, res: Response) {
  const q = (req.query.q as string | undefined)?.trim();
  if (!q || q.length < 2) {
    return res.json({ ok: true, patients: [] });
  }

  const like = `%${q}%`;
  const patients = db
    .prepare(
      `SELECT p.id, p.national_id, p.prefix_th, p.first_name_th, p.last_name_th,
              u.email, u.phone, u.full_name
       FROM patients p
       JOIN users u ON p.user_id = u.id
       WHERE p.first_name_th LIKE ? OR p.last_name_th LIKE ?
          OR p.national_id LIKE ? OR u.phone LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?
       LIMIT 20`
    )
    .all(like, like, like, like, like, like);

  return res.json({ ok: true, patients });
}

// ---------------------------------------------------------------------------
// POST /api/lab/results   (admin / nurse only)
// Create a lab result for a patient AND notify them (email + in-app flag).
// Body: { patientId, test_name, category, result_value, unit, ref_range,
//         flag, note, doctor_name, test_date }
// ---------------------------------------------------------------------------
const createLabSchema = z.object({
  patientId: z.string().min(1, "ต้องระบุผู้ป่วย"),
  test_name: z.string().min(1, "ต้องระบุชื่อการตรวจ"),
  category: z.enum(["general", "blood", "xray", "ultrasound", "other"]).default("general"),
  result_value: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  ref_range: z.string().nullable().optional(),
  flag: z.enum(["normal", "high", "low", "critical"]).default("normal"),
  note: z.string().nullable().optional(),
  doctor_name: z.string().nullable().optional(),
  test_date: z.string().min(1, "ต้องระบุวันที่ตรวจ"),
});

export async function createLabResult(req: Request, res: Response) {
  const parsed = createLabSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }
  const f = parsed.data;

  // Verify patient exists + fetch contact info
  const patient = db
    .prepare(
      `SELECT p.id, p.prefix_th, p.first_name_th, p.last_name_th, u.email, u.full_name
       FROM patients p JOIN users u ON p.user_id = u.id WHERE p.id = ?`
    )
    .get(f.patientId) as any;

  if (!patient) {
    return res.status(404).json({ error: "patient_not_found", message: "ไม่พบผู้ป่วยนี้" });
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO lab_results
       (id, patient_id, test_name, category, result_value, unit, ref_range, flag, note, doctor_name, test_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    f.patientId,
    f.test_name,
    f.category,
    f.result_value ?? null,
    f.unit ?? null,
    f.ref_range ?? null,
    f.flag,
    f.note ?? null,
    f.doctor_name ?? null,
    f.test_date
  );

  // Notify patient via email (best-effort — don't fail the request if email fails)
  const patientName = patient.full_name || `${patient.prefix_th || ""}${patient.first_name_th || ""} ${patient.last_name_th || ""}`.trim();
  try {
    if (patient.email) {
      await sendLabResultEmail(patient.email, {
        patientName,
        testName: f.test_name,
        testDate: f.test_date,
        flag: f.flag,
        resultValue: f.result_value,
        unit: f.unit,
        refRange: f.ref_range,
        note: f.note,
        doctorName: f.doctor_name,
      });
    }
  } catch (mailErr) {
    console.error("[LAB] email notify failed:", mailErr);
  }

  return res.json({ ok: true, id, message: "บันทึกและส่งผลตรวจเรียบร้อยแล้ว" });
}
