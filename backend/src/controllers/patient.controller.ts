import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db } from "../db/db";

// All handlers here run behind requireAuth - req.patientId is set server-side
// from the session, never from the request body/query/params.

function getPatientOr404(res: Response, patientId?: string) {
  if (!patientId) {
    res.status(404).json({ error: "no_patient_record" });
    return undefined;
  }
  return patientId;
}

// ---------------------------------------------------------------------------
// GET /api/patient/profile
// ---------------------------------------------------------------------------
export function getProfile(req: Request, res: Response) {
  const patientId = getPatientOr404(res, req.patientId);
  if (!patientId) return;

  const patient = db.prepare(`SELECT * FROM patients WHERE id = ?`).get(patientId);
  const emergencyContact = db
    .prepare(`SELECT full_name, relationship, phone FROM emergency_contacts WHERE patient_id = ?`)
    .get(patientId);

  return res.json({ ok: true, patient, emergencyContact: emergencyContact || null });
}

// ---------------------------------------------------------------------------
// PUT /api/patient/profile   (ID-card / bio data - section 1)
// ---------------------------------------------------------------------------
const idCardSchema = z.object({
  nationalId: z.string().regex(/^[0-9]{13}$/, "เลขบัตรประชาชนต้องมี 13 หลัก").optional(),
  prefixTh: z.string().max(20).optional(),
  firstNameTh: z.string().max(100).optional(),
  lastNameTh: z.string().max(100).optional(),
  prefixEn: z.string().max(20).optional(),
  firstNameEn: z.string().max(100).optional(),
  lastNameEn: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  dateOfBirth: z.string().optional(), // ISO date, e.g. 1998-05-20
  gender: z.enum(["male", "female", "other"]).optional(),
  religion: z.string().max(50).optional(),
});

export function updateProfile(req: Request, res: Response) {
  const patientId = getPatientOr404(res, req.patientId);
  if (!patientId) return;

  const parsed = idCardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }
  const f = parsed.data;

  if (f.nationalId) {
    const dup = db
      .prepare(`SELECT id FROM patients WHERE national_id = ? AND id != ?`)
      .get(f.nationalId, patientId);
    if (dup) return res.status(409).json({ error: "national_id_in_use" });
  }

  db.prepare(
    `UPDATE patients SET
      national_id = COALESCE(?, national_id),
      prefix_th = COALESCE(?, prefix_th),
      first_name_th = COALESCE(?, first_name_th),
      last_name_th = COALESCE(?, last_name_th),
      prefix_en = COALESCE(?, prefix_en),
      first_name_en = COALESCE(?, first_name_en),
      last_name_en = COALESCE(?, last_name_en),
      address = COALESCE(?, address),
      date_of_birth = COALESCE(?, date_of_birth),
      gender = COALESCE(?, gender),
      religion = COALESCE(?, religion),
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    f.nationalId ?? null,
    f.prefixTh ?? null,
    f.firstNameTh ?? null,
    f.lastNameTh ?? null,
    f.prefixEn ?? null,
    f.firstNameEn ?? null,
    f.lastNameEn ?? null,
    f.address ?? null,
    f.dateOfBirth ?? null,
    f.gender ?? null,
    f.religion ?? null,
    patientId
  );

  return res.json({ ok: true });
}

// ---------------------------------------------------------------------------
// PUT /api/patient/profile-image   (base64 data URL)
// ---------------------------------------------------------------------------
const profileImageSchema = z.object({
  profileImage: z
    .string()
    .regex(/^data:image\/(png|jpe?g|gif|webp);base64,/, "รูปต้องเป็น data URL (png/jpg/gif/webp)")
    .max(2_000_000, "รูปใหญ่เกินไป (สูงสุด ~1.5MB)"),
});

export function updateProfileImage(req: Request, res: Response) {
  const patientId = getPatientOr404(res, req.patientId);
  if (!patientId) return;

  const parsed = profileImageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }

  db.prepare(`UPDATE patients SET profile_image = ?, updated_at = datetime('now') WHERE id = ?`).run(
    parsed.data.profileImage,
    patientId
  );

  return res.json({ ok: true });
}

// ---------------------------------------------------------------------------
// PUT /api/patient/medical-history   (section 2)
// ---------------------------------------------------------------------------
const medicalHistorySchema = z.object({
  drugFoodAllergies: z.string().max(1000).optional().nullable(),
  bloodType: z.enum(["A", "B", "AB", "O", "unknown"]).optional(),
  congenitalDiseases: z.string().max(1000).optional().nullable(),
});

export function updateMedicalHistory(req: Request, res: Response) {
  const patientId = getPatientOr404(res, req.patientId);
  if (!patientId) return;

  const parsed = medicalHistorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }
  const f = parsed.data;

  db.prepare(
    `UPDATE patients SET
      drug_food_allergies = COALESCE(?, drug_food_allergies),
      blood_type = COALESCE(?, blood_type),
      congenital_diseases = COALESCE(?, congenital_diseases),
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(f.drugFoodAllergies ?? null, f.bloodType ?? null, f.congenitalDiseases ?? null, patientId);

  return res.json({ ok: true });
}

// ---------------------------------------------------------------------------
// PUT /api/patient/emergency-contact   (section 3)
// ---------------------------------------------------------------------------
const emergencyContactSchema = z.object({
  fullName: z.string().min(1).max(150),
  relationship: z.string().min(1).max(50),
  phone: z.string().regex(/^0[0-9]{9}$/, "เบอร์โทรต้องเป็นตัวเลข 10 หลัก"),
});

export function upsertEmergencyContact(req: Request, res: Response) {
  const patientId = getPatientOr404(res, req.patientId);
  if (!patientId) return;

  const parsed = emergencyContactSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }
  const { fullName, relationship, phone } = parsed.data;

  const existing = db.prepare(`SELECT id FROM emergency_contacts WHERE patient_id = ?`).get(patientId);
  if (existing) {
    db.prepare(
      `UPDATE emergency_contacts SET full_name = ?, relationship = ?, phone = ?, updated_at = datetime('now')
       WHERE patient_id = ?`
    ).run(fullName, relationship, phone, patientId);
  } else {
    db.prepare(
      `INSERT INTO emergency_contacts (id, patient_id, full_name, relationship, phone) VALUES (?, ?, ?, ?, ?)`
    ).run(uuid(), patientId, fullName, relationship, phone);
  }

  return res.json({ ok: true });
}

// ---------------------------------------------------------------------------
// PUT /api/patient/insurance   (สิทธิการรักษาพยาบาล)
// ---------------------------------------------------------------------------
const insuranceSchema = z.object({
  insuranceType: z.enum(["ucs", "social_security", "civil_servant", "none", "other"]),
});

export function updateInsurance(req: Request, res: Response) {
  const patientId = getPatientOr404(res, req.patientId);
  if (!patientId) return;

  const parsed = insuranceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }

  db.prepare(`UPDATE patients SET insurance_type = ?, updated_at = datetime('now') WHERE id = ?`).run(
    parsed.data.insuranceType,
    patientId
  );

  return res.json({ ok: true });
}

// ---------------------------------------------------------------------------
// POST /api/patient/pdpa-consent
// ---------------------------------------------------------------------------
export function acceptPdpaConsent(req: Request, res: Response) {
  const patientId = getPatientOr404(res, req.patientId);
  if (!patientId) return;

  db.prepare(
    `UPDATE patients SET pdpa_consent = 1, pdpa_consent_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
  ).run(patientId);

  return res.json({ ok: true });
}

// ---------------------------------------------------------------------------
// PUT /api/patient/save-all   — save everything in one call
// ---------------------------------------------------------------------------
const saveAllSchema = z.object({
  // ID card / bio
  nationalId: z.string().regex(/^[0-9]{13}$/, "เลขบัตรประชาชนต้องมี 13 หลัก").optional().or(z.literal("")),
  prefixTh: z.string().max(20).optional().or(z.literal("")),
  firstNameTh: z.string().max(100).optional().or(z.literal("")),
  lastNameTh: z.string().max(100).optional().or(z.literal("")),
  prefixEn: z.string().max(20).optional().or(z.literal("")),
  firstNameEn: z.string().max(100).optional().or(z.literal("")),
  lastNameEn: z.string().max(100).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other"]).optional().or(z.literal("")),
  religion: z.string().max(50).optional().or(z.literal("")),
  // Medical history
  drugFoodAllergies: z.string().max(1000).optional().or(z.literal("")),
  bloodType: z.enum(["A", "B", "AB", "O", "unknown"]).optional(),
  congenitalDiseases: z.string().max(1000).optional().or(z.literal("")),
  // Insurance — required
  insuranceType: z.enum(["ucs", "social_security", "civil_servant", "none", "other"], {
    required_error: "กรุณาเลือกสิทธิการรักษาพยาบาล",
    invalid_type_error: "สิทธิการรักษาไม่ถูกต้อง",
  }),
  // Emergency contact
  emergencyFullName: z.string().max(150).optional().or(z.literal("")),
  emergencyRelationship: z.string().max(50).optional().or(z.literal("")),
  emergencyPhone: z.string().optional().or(z.literal("")),
  // PDPA
  pdpaConsent: z.boolean().optional(),
});

export function saveAll(req: Request, res: Response) {
  const patientId = getPatientOr404(res, req.patientId);
  if (!patientId) return;

  const parsed = saveAllSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }
  const f = parsed.data;

  const tx = db.transaction(() => {
    // 1. Update patient bio
    db.prepare(
      `UPDATE patients SET
        national_id = COALESCE(NULLIF(?, ''), national_id),
        prefix_th = COALESCE(NULLIF(?, ''), prefix_th),
        first_name_th = COALESCE(NULLIF(?, ''), first_name_th),
        last_name_th = COALESCE(NULLIF(?, ''), last_name_th),
        prefix_en = COALESCE(NULLIF(?, ''), prefix_en),
        first_name_en = COALESCE(NULLIF(?, ''), first_name_en),
        last_name_en = COALESCE(NULLIF(?, ''), last_name_en),
        address = COALESCE(NULLIF(?, ''), address),
        date_of_birth = COALESCE(NULLIF(?, ''), date_of_birth),
        gender = COALESCE(NULLIF(?, ''), gender),
        religion = COALESCE(NULLIF(?, ''), religion),
        drug_food_allergies = COALESCE(NULLIF(?, ''), drug_food_allergies),
        blood_type = COALESCE(NULLIF(?, ''), blood_type),
        congenital_diseases = COALESCE(NULLIF(?, ''), congenital_diseases),
        insurance_type = COALESCE(NULLIF(?, ''), insurance_type),
        pdpa_consent = CASE WHEN ? = 1 THEN 1 ELSE pdpa_consent END,
        pdpa_consent_at = CASE WHEN ? = 1 THEN datetime('now') ELSE pdpa_consent_at END,
        updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      f.nationalId ?? null,
      f.prefixTh ?? null,
      f.firstNameTh ?? null,
      f.lastNameTh ?? null,
      f.prefixEn ?? null,
      f.firstNameEn ?? null,
      f.lastNameEn ?? null,
      f.address ?? null,
      f.dateOfBirth ?? null,
      f.gender ?? null,
      f.religion ?? null,
      f.drugFoodAllergies ?? null,
      f.bloodType ?? null,
      f.congenitalDiseases ?? null,
      f.insuranceType ?? null,
      f.pdpaConsent ? 1 : 0,
      f.pdpaConsent ? 1 : 0,
      patientId
    );

    // 2. Upsert emergency contact
    if (f.emergencyFullName || f.emergencyRelationship || f.emergencyPhone) {
      const existing = db.prepare(`SELECT id FROM emergency_contacts WHERE patient_id = ?`).get(patientId);
      if (existing) {
        db.prepare(
          `UPDATE emergency_contacts SET
            full_name = COALESCE(NULLIF(?, ''), full_name),
            relationship = COALESCE(NULLIF(?, ''), relationship),
            phone = COALESCE(NULLIF(?, ''), phone),
            updated_at = datetime('now')
           WHERE patient_id = ?`
        ).run(f.emergencyFullName ?? null, f.emergencyRelationship ?? null, f.emergencyPhone ?? null, patientId);
      } else {
        db.prepare(
          `INSERT INTO emergency_contacts (id, patient_id, full_name, relationship, phone) VALUES (?, ?, ?, ?, ?)`
        ).run(uuid(), patientId, f.emergencyFullName ?? "", f.emergencyRelationship ?? "", f.emergencyPhone ?? "");
      }
    }
  });

  tx();
  return res.json({ ok: true });
}
