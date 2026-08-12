/**
 * Seed script — สร้างผลตรวจจำลอง (lab_results) ให้ผู้ป่วยที่มีอยู่แล้วในระบบ
 *
 * รันด้วย:  npx tsx scripts/seed-lab-results.ts
 *
 * สคริปต์นี้จะ:
 *  1. หา patients ทั้งหมดในระบบ
 *  2. ถ้าไม่มีผู้ป่วยเลย จะสร้างผู้ป่วยจำลอง 1 คน (user + patient)
 *  3. แทรกผลตรวจจำลองหลายรายการ (CBC, ไขมันเลือด, เอกซเรย์ปอด ฯลฯ)
 *     โดยกำหนด flag ปกติ/สูง/ต่ำ/วิกฤต ให้หลากหลาย
 */

import { db } from "../src/db/db";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

const LAB_TEMPLATES = [
  { test_name: "CBC - เม็ดเลือดขาว (WBC)", category: "blood", result_value: "11.2", unit: "10^3/µL", ref_range: "4.0-11.0", flag: "high", note: "สูงเล็กน้อย อาจมีการติดเชื้อ" },
  { test_name: "CBC - เม็ดเลือดแดง (RBC)", category: "blood", result_value: "4.8", unit: "10^6/µL", ref_range: "4.2-5.4", flag: "normal", note: "" },
  { test_name: "CBC - ฮีโมโกลบิน (Hb)", category: "blood", result_value: "13.5", unit: "g/dL", ref_range: "12.0-16.0", flag: "normal", note: "" },
  { test_name: "ไขมันในเลือด - คอเลสเตอรอลรวม", category: "blood", result_value: "245", unit: "mg/dL", ref_range: "<200", flag: "high", note: "สูงกว่าเกณฑ์ แนะนำควบคุมอาหาร" },
  { test_name: "ไขมันในเลือด - Triglyceride", category: "blood", result_value: "180", unit: "mg/dL", ref_range: "<150", flag: "high", note: "" },
  { test_name: "น้ำตาลในเลือด (FBS)", category: "blood", result_value: "92", unit: "mg/dL", ref_range: "70-100", flag: "normal", note: "" },
  { test_name: "เอกซเรย์ปอด (Chest X-ray)", category: "xray", result_value: "ปอดใส ไม่พบความผิดปกติ", unit: "", ref_range: "", flag: "normal", note: "ไม่พบฝ้าขาวหรือก้อนเนื้อ" },
  { test_name: "การทำงานของไต (Creatinine)", category: "blood", result_value: "1.4", unit: "mg/dL", ref_range: "0.6-1.3", flag: "high", note: "สูงกว่าเกณฑ์เล็กน้อย ควรติดตาม" },
  { test_name: "โพแทสเซียม (K+)", category: "blood", result_value: "3.2", unit: "mmol/L", ref_range: "3.5-5.1", flag: "low", note: "ต่ำกว่าเกณฑ์ แนะนำเพิ่มปริมาณโพแทสเซียมในอาหาร" },
  { test_name: "เอกซเรย์สมอง (CT Brain)", category: "xray", result_value: "พบเลือดคั่งในสมองข้างซ้าย", unit: "", ref_range: "", flag: "critical", note: "วิกฤต ต้องส่งแพทย์เฉพาะทางระบบประสาททันที" },
];

async function seed() {
  // หาผู้ป่วยที่มีอยู่แล้ว
  let patients = db.prepare(`SELECT id, user_id FROM patients`).all() as { id: string; user_id: string }[];

  // ถ้าไม่มีผู้ป่วยเลย สร้างจำลอง 1 คน
  if (patients.length === 0) {
    console.log("⚠️ ไม่พบผู้ป่วยในระบบ สร้างผู้ป่วยจำลอง...");
    const userId = uuid();
    const passwordHash = await bcrypt.hash("patient1234", 10);
    db.prepare(
      `INSERT OR IGNORE INTO users (id, email, username, phone, phone_verified, password_hash, created_at, updated_at, role, full_name)
       VALUES (?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'), 'user', ?)`
    ).run(userId, "patient_demo@nudmedi.com", "patient_demo", "0899999999", passwordHash, "ผู้ป่วย จำลอง");
    const patientId = uuid();
    db.prepare(
      `INSERT OR IGNORE INTO patients (id, user_id, prefix_th, first_name_th, last_name_th, pdpa_consent)
       VALUES (?, ?, 'นาย', 'ผู้ป่วย', 'จำลอง', 1)`
    ).run(patientId, userId);
    patients = [{ id: patientId, user_id: userId }];
  }

  let totalInserted = 0;
  for (const p of patients) {
    for (const t of LAB_TEMPLATES) {
      const daysAgo = Math.floor(Math.random() * 60) + 1; // 1-60 วันที่แล้ว
      db.prepare(
        `INSERT INTO lab_results (id, patient_id, test_name, category, result_value, unit, ref_range, flag, note, doctor_name, test_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`
      ).run(
        uuid(),
        p.id,
        t.test_name,
        t.category,
        t.result_value,
        t.unit,
        t.ref_range,
        t.flag,
        t.note,
        "แพทย์ นทช. (จำลอง)",
        `-${daysAgo} days`
      );
      totalInserted++;
    }
  }

  console.log(`✅ Seed ผลตรวจเสร็จสิ้น: แทรก ${totalInserted} รายการ ให้ผู้ป่วย ${patients.length} คน`);
  console.log(`📋 หมวดหมู่: เลือด, เอกซเรย์, ทั่วไป | สถานะ: ปกติ/สูง/ต่ำ/วิกฤต`);
}

seed().then(() => process.exit(0)).catch((e) => {
  console.error("❌ Seed ล้มเหลว:", e);
  process.exit(1);
});
