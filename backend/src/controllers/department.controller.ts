import { Request, Response } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { db } from "../db/db";

// ---------------------------------------------------------------------------
// GET /api/admin/departments
// Returns all departments ordered by sort_order
// ---------------------------------------------------------------------------
export function getDepartments(req: Request, res: Response) {
  const departments = db
    .prepare(
      `SELECT id, name, description, is_active, sort_order, created_at
       FROM departments ORDER BY sort_order ASC`
    )
    .all();

  return res.json({ ok: true, departments });
}

// ---------------------------------------------------------------------------
// GET /api/admin/departments/active
// Returns only active departments
// ---------------------------------------------------------------------------
export function getActiveDepartments(req: Request, res: Response) {
  const departments = db
    .prepare(
      `SELECT id, name, description, sort_order
       FROM departments WHERE is_active = 1 ORDER BY sort_order ASC`
    )
    .all();

  return res.json({ ok: true, departments });
}

// ---------------------------------------------------------------------------
// POST /api/admin/departments
// Create a new department
// ---------------------------------------------------------------------------
const createDeptSchema = z.object({
  name: z.string().min(1, "ต้องระบุชื่อแผนก"),
  description: z.string().optional(),
  sort_order: z.number().int().optional(),
});

export function createDepartment(req: Request, res: Response) {
  const parsed = createDeptSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }

  const { name, description, sort_order } = parsed.data;

  // Check duplicate
  const existing = db.prepare(`SELECT id FROM departments WHERE name = ?`).get(name) as any;
  if (existing) {
    return res.status(409).json({ error: "duplicate", message: "มีแผนกนี้อยู่แล้ว" });
  }

  const id = uuid();
  // Get max sort_order if not provided
  let order = sort_order;
  if (order === undefined) {
    const max = db.prepare(`SELECT MAX(sort_order) as m FROM departments`).get() as any;
    order = (max?.m ?? 0) + 1;
  }

  db.prepare(
    `INSERT INTO departments (id, name, description, sort_order) VALUES (?, ?, ?, ?)`
  ).run(id, name, description ?? null, order);

  return res.status(201).json({ ok: true, id, message: "เพิ่มแผนกเรียบร้อย" });
}

// ---------------------------------------------------------------------------
// PUT /api/admin/departments/:id
// Update a department
// ---------------------------------------------------------------------------
const updateDeptSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  is_active: z.number().int().optional(),
  sort_order: z.number().int().optional(),
});

export function updateDepartment(req: Request, res: Response) {
  const { id } = req.params;
  const parsed = updateDeptSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }

  const existing = db.prepare(`SELECT id FROM departments WHERE id = ?`).get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: "not_found", message: "ไม่พบแผนกนี้" });
  }

  const updates: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE departments SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }

  return res.json({ ok: true, message: "อัปเดตแผนกเรียบร้อย" });
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/departments/:id
// Delete a department
// ---------------------------------------------------------------------------
export function deleteDepartment(req: Request, res: Response) {
  const { id } = req.params;

  const existing = db.prepare(`SELECT id FROM departments WHERE id = ?`).get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: "not_found", message: "ไม่พบแผนกนี้" });
  }

  db.prepare(`DELETE FROM departments WHERE id = ?`).run(id);

  return res.json({ ok: true, message: "ลบแผนกเรียบร้อย" });
}