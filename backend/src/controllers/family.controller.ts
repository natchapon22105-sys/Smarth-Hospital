import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db } from "../db/db";

// requireAuth already ran - req.userId comes from the session, never from client.

// ---------------------------------------------------------------------------
// GET /api/family/members
// Returns the current user's family members (sub-accounts) + self info.
// ---------------------------------------------------------------------------
export function getFamilyMembers(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  // self
  const self = db
    .prepare(
      `SELECT p.id as patientId, u.email, u.phone,
              p.prefix_th, p.first_name_th, p.last_name_th, p.national_id
       FROM patients p JOIN users u ON p.user_id = u.id WHERE u.id = ?`
    )
    .get(userId) as any;

  // members
  const members = db
    .prepare(
      `SELECT fm.id as memberId, fm.relationship, fm.nickname, fm.patient_id as patientId,
              p.prefix_th, p.first_name_th, p.last_name_th, p.national_id, p.date_of_birth
       FROM family_members fm
       JOIN patients p ON fm.patient_id = p.id
       WHERE fm.owner_user_id = ?
       ORDER BY fm.created_at ASC`
    )
    .all(userId);

  return res.json({ ok: true, self: self || null, members });
}

// ---------------------------------------------------------------------------
// POST /api/family/members
// Create a sub-account (family member) with its own patient record.
// Body: { prefixTh, firstNameTh, lastNameTh, nationalId?, dateOfBirth?,
//         relationship, nickname? }
// ---------------------------------------------------------------------------
const createSchema = z.object({
  prefixTh: z.string().max(20).optional(),
  firstNameTh: z.string().min(1, "กรุณาระบุชื่อ"),
  lastNameTh: z.string().min(1, "กรุณาระบุนามสกุล"),
  nationalId: z
    .string()
    .regex(/^[0-9]{13}$/, "เลขบัตรประชาชนต้องมี 13 หลัก")
    .optional(),
  dateOfBirth: z.string().optional(),
  relationship: z.enum(["child", "parent", "spouse", "other"]).default("other"),
  nickname: z.string().max(50).optional(),
});

export function createFamilyMember(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }
  const f = parsed.data;

  // national_id must be unique if provided
  if (f.nationalId) {
    const dup = db
      .prepare(`SELECT id FROM patients WHERE national_id = ?`)
      .get(f.nationalId);
    if (dup) {
      return res.status(409).json({ error: "duplicate_national_id", message: "เลขบัตรประชาชนนี้มีในระบบแล้ว" });
    }
  }

  const patientId = uuid();
  const memberId = uuid();

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO patients (id, user_id, national_id, prefix_th, first_name_th, last_name_th, date_of_birth, pdpa_consent, pdpa_consent_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?, 1, datetime('now'))`
    ).run(patientId, f.nationalId ?? null, f.prefixTh ?? null, f.firstNameTh, f.lastNameTh, f.dateOfBirth ?? null);

    db.prepare(
      `INSERT INTO family_members (id, owner_user_id, patient_id, relationship, nickname)
       VALUES (?, ?, ?, ?, ?)`
    ).run(memberId, userId, patientId, f.relationship, f.nickname ?? null);
  });
  tx();

  return res.status(201).json({
    ok: true,
    member: {
      memberId,
      patientId,
      relationship: f.relationship,
      nickname: f.nickname ?? null,
      prefix_th: f.prefixTh ?? null,
      first_name_th: f.firstNameTh,
      last_name_th: f.lastNameTh,
      national_id: f.nationalId ?? null,
    },
    message: "เพิ่มสมาชิกครอบครัวเรียบร้อยแล้ว",
  });
}

// ---------------------------------------------------------------------------
// DELETE /api/family/members/:id
// Remove a family member (only by owner).
// ---------------------------------------------------------------------------
export function deleteFamilyMember(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const { id } = req.params;
  const member = db
    .prepare(`SELECT patient_id FROM family_members WHERE id = ? AND owner_user_id = ?`)
    .get(id, userId) as any;

  if (!member) {
    return res.status(404).json({ error: "not_found", message: "ไม่พบสมาชิกนี้" });
  }

  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM family_members WHERE id = ?`).run(id);
    // cascade deletes bookings/lab_results via ON DELETE CASCADE
    db.prepare(`DELETE FROM patients WHERE id = ?`).run(member.patient_id);
  });
  tx();

  return res.json({ ok: true, message: "ลบสมาชิกเรียบร้อยแล้ว" });
}
