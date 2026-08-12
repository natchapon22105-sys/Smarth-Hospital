import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = process.env.DB_PATH || "./data/nudmedi.db";
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ---------------------------------------------------------------------------
// Schema. Kept in one place so the whole data model is easy to review.
// Swap better-sqlite3 for Postgres/MySQL later without changing the rest of
// the app much, as long as the query layer in each model stays isolated here.
// ---------------------------------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  email           TEXT UNIQUE NOT NULL,
  username        TEXT UNIQUE NOT NULL,
  phone           TEXT UNIQUE NOT NULL,
  phone_verified  INTEGER NOT NULL DEFAULT 0,
  password_hash   TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id          TEXT PRIMARY KEY,
  phone       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  purpose     TEXT NOT NULL, -- 'register' | 'login'
  verified    INTEGER NOT NULL DEFAULT 0,
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Short-lived proof that a phone number was OTP-verified, consumed by
-- POST /api/auth/register so registration cannot skip the OTP step.
CREATE TABLE IF NOT EXISTS otp_tokens (
  token       TEXT PRIMARY KEY,
  phone       TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  used        INTEGER NOT NULL DEFAULT 0
);

-- Core patient record. One row per user, created empty at registration and
-- filled in via the "patient intake" form (ID card OCR + manual edits).
CREATE TABLE IF NOT EXISTS patients (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- from ID card (or manual entry)
  national_id           TEXT UNIQUE,          -- 13-digit Thai citizen ID
  prefix_th             TEXT,                 -- คำนำหน้า (TH)
  first_name_th         TEXT,
  last_name_th          TEXT,
  prefix_en             TEXT,                 -- Prefix (EN)
  first_name_en         TEXT,
  last_name_en          TEXT,
  address               TEXT,                 -- ที่อยู่ปัจจุบัน
  date_of_birth         TEXT,                 -- ISO date
  gender                TEXT,                 -- 'male' | 'female' | 'other'
  religion              TEXT,

  -- medical history
  drug_food_allergies   TEXT,                 -- free text, nullable
  blood_type            TEXT,                 -- 'A' | 'B' | 'AB' | 'O' | 'unknown'
  congenital_diseases   TEXT,                 -- free text, nullable

  -- coverage
  insurance_type        TEXT,                 -- 'ucs' | 'social_security' | 'civil_servant'

  -- consent
  pdpa_consent          INTEGER NOT NULL DEFAULT 0,
  pdpa_consent_at       TEXT,

  -- profile picture (base64 data URL)
  profile_image         TEXT,

  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id            TEXT PRIMARY KEY,
  patient_id    TEXT UNIQUE NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  relationship  TEXT NOT NULL,
  phone         TEXT NOT NULL,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id            TEXT PRIMARY KEY,
  patient_id    TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  service_type  TEXT NOT NULL DEFAULT 'general_queue',
  symptoms      TEXT,                          -- อาการที่กรอก
  urgency       TEXT,                          -- 'emergency' | 'urgent' | 'routine' | 'non_urgent'
  recommended_department TEXT,                  -- แผนกที่แนะนำ
  ai_recommendation TEXT,                       -- JSON ของ AI analysis
  appointment_date TEXT,                        -- วันที่นัด (YYYY-MM-DD)
  appointment_time TEXT,                        -- เวลาที่นัด (HH:mm)
  note          TEXT,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | cancelled | completed
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- สำหรับเก็บรูปอาการ
CREATE TABLE IF NOT EXISTS symptom_images (
  id            TEXT PRIMARY KEY,
  booking_id    TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  image_data    BLOB NOT NULL,
  mime_type     TEXT NOT NULL DEFAULT 'image/jpeg',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Migrations — add columns that may not exist in older databases
const migrations = [
  `ALTER TABLE bookings ADD COLUMN symptoms TEXT`,
  `ALTER TABLE bookings ADD COLUMN urgency TEXT`,
  `ALTER TABLE bookings ADD COLUMN recommended_department TEXT`,
  `ALTER TABLE bookings ADD COLUMN ai_recommendation TEXT`,
  `ALTER TABLE bookings ADD COLUMN appointment_date TEXT`,
  `ALTER TABLE bookings ADD COLUMN appointment_time TEXT`,
  `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`,
  `ALTER TABLE users ADD COLUMN last_activity TEXT`,
  `ALTER TABLE users ADD COLUMN full_name TEXT`,
];

for (const sql of migrations) {
  try {
    db.exec(sql);
  } catch {
    // Column already exists — ignore
  }
}

// Create system_settings table
db.exec(`
CREATE TABLE IF NOT EXISTS system_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
)
`);

// Nurse registration requests (pending admin approval)
db.exec(`
CREATE TABLE IF NOT EXISTS nurse_registrations (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  status        TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at   TEXT,
  approved_by   TEXT REFERENCES users(id)
)
`);

// Nurse activity log
db.exec(`
CREATE TABLE IF NOT EXISTS nurse_activity_log (
  id            TEXT PRIMARY KEY,
  nurse_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action        TEXT NOT NULL, -- 'login' | 'logout' | 'booking_status'
  details       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
)
`);

// Lab / test results (ผลตรวจ)
db.exec(`
CREATE TABLE IF NOT EXISTS lab_results (
  id            TEXT PRIMARY KEY,
  patient_id    TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  test_name     TEXT NOT NULL,                       -- ชื่อการตรวจ เช่น "CBC", "ไขมันในเลือด"
  category      TEXT NOT NULL DEFAULT 'general',     -- general | blood | xray | ultrasound | other
  result_value  TEXT,                                -- ค่าผลตรวจ (อาจเป็นข้อความอิสระ)
  unit          TEXT,                                -- หน่วย เช่น mg/dL
  ref_range     TEXT,                                -- เกณฑ์ปกติ เช่น "70-100"
  flag          TEXT NOT NULL DEFAULT 'normal',      -- normal | high | low | critical
  note          TEXT,                                -- หมายเหตุจากแพทย์/เจ้าหน้าที่
  doctor_name   TEXT,                                -- ผู้ออกผล
  test_date     TEXT NOT NULL,                       -- วันที่ตรวจ (YYYY-MM-DD)
  is_read       INTEGER NOT NULL DEFAULT 0,          -- ผู้ใช้เปิดดูผลแล้วหรือยัง (0=ยังไม่ได้อ่าน)
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
)
`);

// Family / sub-accounts — บัญชีรองผูกกับผู้ใช้หลัก (owner)
// แต่ละสมาชิกมี patients row ของตัวเอง (เพื่อจองคิว/เก็บผลตรวจแยกกัน)
db.exec(`
CREATE TABLE IF NOT EXISTS family_members (
  id            TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id    TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  relationship  TEXT NOT NULL DEFAULT 'other',  -- self | child | parent | spouse | other
  nickname      TEXT,                           -- ชื่อเรียกในแอป (ถ้าไม่ระบุใช้ชื่อจริง)
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
)
`);

// Migration helper: add a column only if it does not already exist.
// Running a bare ALTER TABLE ... ADD COLUMN on every boot crashes the server
// with "duplicate column name" once the column already exists.
function addColumnIfMissing(table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// Migration: add profile_image column if missing (for existing databases)
addColumnIfMissing("patients", "profile_image", "TEXT");

// Migration: add is_read column if missing (for existing databases)
addColumnIfMissing("lab_results", "is_read", "INTEGER NOT NULL DEFAULT 0");

// Seed default settings
const insertSetting = db.prepare(`INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)`);
insertSetting.run("max_queue_per_hour", "16");
insertSetting.run("ai_model", "gpt-4o-mini");
insertSetting.run("openrouter_api_key", "");
insertSetting.run("business_hours_start", "08:00");
insertSetting.run("business_hours_end", "16:30");
insertSetting.run("slot_duration_minutes", "30");
