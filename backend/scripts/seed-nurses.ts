/**
 * Seed script — สร้างพยาบาลจำลองที่ล็อกอินล่าสุด (แสดงสถานะ "ออนไลน์")
 *
 * รันด้วย:  npx tsx scripts/seed-nurses.ts
 *
 * สคริปต์นี้จะ:
 *  1. สร้าง users (role=nurse) จำนวน N คน พร้อมรหัสผ่านที่กำหนด
 *  2. สร้าง nurse_registrations (status=approved) ให้ตรงกับ user
 *  3. อัปเดต last_activity = เมื่อกี่นาทีที่แล้ว (default: ตอนนี้ → ออนไลน์)
 *  4. บันทึก nurse_activity_log วันนี้ เพื่อให้แสดง todayActions
 *
 * หมายเหตุ: ถ้ามี email/username ซ้ำจะข้ามการแทรกลงไป (ใช้ INSERT OR IGNORE)
 */

import { db } from "../src/db/db";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

const NURSES = [
  { email: "nurse1@nudmedi.com", username: "nurse1", fullName: "พยาบาล สมใจ รักงาน", phone: "0811111141", minutesAgo: 1 },
  { email: "nurse2@nudmedi.com", username: "nurse2", fullName: "พยาบาล วิไล ใจเย็น", phone: "0822222242", minutesAgo: 2 },
  { email: "nurse3@nudmedi.com", username: "nurse3", fullName: "พยาบาล มาลี ยิ้มสวย", phone: "0833333343", minutesAgo: 3 },
  { email: "nurse4@nudmedi.com", username: "nurse4", fullName: "พยาบาล ชลธิชา ดูแลดี", phone: "0844444444", minutesAgo: 8 }, // >5 นาที → ออฟไลน์
];

const PASSWORD = "nurse1234";

async function seed() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const rand = Math.floor(Math.random() * 9000) + 1000;

  for (const n of NURSES) {
    const userId = uuid();
    // ทำให้ email/username/phone ไม่ซ้ำกันทุกครั้งที่รัน (เติมเลขสุ่มท้าย)
    const suffix = `_${rand}`;
    const email = n.email.replace("@", `${suffix}@`);
    const username = `${n.username}${suffix}`;
    const phone = `${n.phone}${rand % 10}`;

    // 1. users (role=nurse)
    db.prepare(
      `INSERT OR IGNORE INTO users (id, email, username, phone, phone_verified, password_hash, created_at, updated_at, role, full_name, last_activity)
       VALUES (?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'), 'nurse', ?, datetime('now', ?))`
    ).run(
      userId,
      email,
      username,
      phone,
      passwordHash,
      n.fullName,
      `-${n.minutesAgo} minutes`
    );

    // หา user id จริง (ต้องมีก่อน insert activity log เพื่อไม่ให้ผิด FK)
    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email) as { id: string } | undefined;
    if (!existing) {
      console.warn(`⚠️ ข้าม ${email} — ไม่พบ user หลัง insert`);
      continue;
    }
    const realUserId = existing.id;

    // 2. nurse_registrations (approved)
    db.prepare(
      `INSERT OR IGNORE INTO nurse_registrations (id, email, username, password_hash, full_name, phone, status, created_at, approved_at)
       VALUES (?, ?, ?, ?, ?, ?, 'approved', datetime('now'), datetime('now'))`
    ).run(uuid(), email, username, passwordHash, n.fullName, phone);

    // 3. activity log วันนี้ (เพื่อให้แสดง todayActions)
    db.prepare(
      `INSERT OR IGNORE INTO nurse_activity_log (id, nurse_id, action, details, created_at)
       VALUES (?, ?, 'login', 'seed login', datetime('now'))`
    ).run(uuid(), realUserId);
  }

  // นับผลลัพธ์
  const total = (db.prepare(`SELECT COUNT(*) as c FROM nurse_registrations WHERE status = 'approved'`).get() as any).c;
  const online = (db.prepare(
    `SELECT COUNT(*) as c FROM users WHERE role = 'nurse' AND last_activity > datetime('now', '-5 minutes')`
  ).get() as any).c;

  console.log(`✅ Seed เสร็จสิ้น: พยาบาลที่อนุมัติแล้ว ${total} คน | ออนไลน์ ${online} คน`);
  console.log(`🔑 รหัสผ่านทุกบัญชี: ${PASSWORD}`);
}

seed().then(() => process.exit(0)).catch((e) => {
  console.error("❌ Seed ล้มเหลว:", e);
  process.exit(1);
});
