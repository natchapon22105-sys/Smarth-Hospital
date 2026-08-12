<p align="center">
  <img src="frontend/public/logo.png" alt="NudMedi Logo" width="96" height="96" />
</p>

<h1 align="center">🏥 NudMedi – Smarth Hospital</h1>

<p align="center">
  ระบบจองคิวโรงพยาบาลอัจฉริยะ (Thai) — AI ช่วยวิเคราะห์อาการ, จองคิวอัตโนมัติ, บริหารคิวพยาบาล และแดชบอร์ดผู้ดูแลระบบ
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14.2.5-black?logo=next.js" />
  <img src="https://img.shields.io/badge/Express-4.x-green" />
  <img src="https://img.shields.io/badge/SQLite-better--sqlite3-blue" />
  <img src="https://img.shields.io/badge/TypeScript-blue" />
  <img src="https://img.shields.io/badge/AI-OpenRouter%20GPT--4o--mini-orange" />
</p>

---

## ✨ ฟีเจอร์หลัก

| หมวดหมู่ | รายละเอียด |
|---------|-----------|
| 🔐 **ระบบสมาชิก** | สมัคร/เข้าสู่ระบบ, ยืนยัน OTP ทางอีเมล, ลืมรหัสผ่าน (รีเซ็ตผ่าน OTP) |
| 🪪 **โปรไฟล์คนไข้** | สแกนบัตรประชาชนด้วย AI (OCR), ข้อมูลสุขภาพ, โรคประจำตัว, การแพ้ยา, กรุ๊ปเลือด, ผู้ติดต่อฉุกเฉิน |
| 🤖 **AI วิเคราะห์อาการ** | พิมพ์อาการ/อัปโหลดรูป/พูด (Speech-to-Text ภาษาไทย) → AI ถามคำถาม 5 ข้อ → วิเคราะห์โรคเบื้องต้น + แนะนำแผนก |
| 📅 **จองคิว** | เลือกวัน-เวลา (ระบบจัดการคิวต่อชั่วโมงอัตโนมัติ), ดูประวัติการจอง |
| 🧑‍⚕️ **ระบบพยาบาล** | เข้าสู่ระบบแยก, ลงทะเบียนรออนุมัติ, ดูคิวรายวัน, เช็คอิน/เสร็จสิ้น/ยกเลิก |
| 🛠️ **ระบบผู้ดูแล (Admin)** | แดชบอร์ดสถิติ, ตั้งค่าระบบ (AI model, API key, เวลาเปิด-ปิด, จำนวนคิว), อนุมัติ/ลบพยาบาล, ดูสถานะออนไลน์ของพยาบาล, สถิติการใช้งาน |
| 📧 **อีเมลอัตโนมัติ** | ส่ง OTP ผ่าน Gmail SMTP |

---

## 🏗️ เทคโนโลยี

- **Frontend:** Next.js 14.2.5 (App Router), React 18, Tailwind CSS, TypeScript
- **Backend:** Node.js, Express 4, TypeScript (CommonJS), `tsx` สำหรับ development
- **Database:** SQLite ผ่าน `better-sqlite3` (ไฟล์ `backend/data/nudmedi.db`)
- **AI:** OpenAI SDK → OpenRouter (`gpt-4o-mini`) สำหรับวิเคราะห์อาการ + OCR บัตรประชาชน
- **Auth:** Session cookie (`nudmedi_session`), bcryptjs hash รหัสผ่าน, ระบบบทบาท (user/admin/nurse)
- **Email:** nodemailer (Gmail SMTP + App Password)
- **Speech-to-Text:** Web Speech API (เบราว์เซอร์, ภาษาไทย th-TH)

---

## 📁 โครงสร้างโปรเจกต์

โปรเจกต์แบ่งเป็น 3 ส่วน (monorepo) ที่แชร์ backend เดียวกัน:

- **backend** (พอร์ต `4000`) — API กลาง
- **frontend** (พอร์ต `3000`) — สำหรับผู้ใช้ทั่วไป (user)
- **staff** (พอร์ต `3001`) — สำหรับพยาบาล (nurse) และผู้ดูแลระบบ (admin) แยกต่างหาก

```
nudmedi 2/
├── backend/                    # Express API (พอร์ต 4000)
│   ├── src/
│   │   ├── app.ts              # ตั้งค่า Express + route
│   │   ├── server.ts           # จุดเริ่มต้นเซิร์ฟเวอร์
│   │   ├── controllers/        # auth, patient, booking, ocr, admin, nurse...
│   │   ├── routes/             # นิยาม API endpoints
│   │   ├── middleware/         # requireAdmin, requireNurse, auth
│   │   ├── db/db.ts            # Schema + migrations (SQLite)
│   │   └── utils/              # session, otp, password, ai.service
│   └── data/nudmedi.db         # ฐานข้อมูล (ไม่ push ขึ้น GitHub)
├── frontend/                   # Next.js สำหรับผู้ใช้ (พอร์ต 3000)
│   ├── app/
│   │   ├── login/              # เข้าสู่ระบบผู้ใช้
│   │   ├── register/           # สมัครสมาชิก
│   │   ├── app-home/           # หน้าเลือกบริการ
│   │   ├── booking/            # จองคิว (AI หลายขั้นตอน)
│   │   └── patient/profile/    # โปรไฟล์คนไข้ + OCR
│   ├── components/             # HamburgerMenu, ServiceCard
│   └── lib/api.ts              # fetch wrapper
├── staff/                      # Next.js สำหรับพยาบาล + admin (พอร์ต 3001)
│   ├── app/
│   │   ├── nurse/              # ระบบคิวพยาบาล + login/register
│   │   └── admin/              # ระบบจัดการผู้ดูแล
│   ├── middleware.ts           # ป้องกัน /nurse, /admin (เช็ค session)
│   └── lib/api.ts              # fetch wrapper
├── run_system.sh               # เริ่มระบบ (backend + frontend + staff)
├── stop_system.sh              # หยุดระบบ
└── push.sh                     # push code ขึ้น GitHub
```

> 💡 **ทำไมต้องแยก `staff` ออกจาก `frontend`?**
> พยาบาลและ admin ทำงานต่างจากผู้ใช้ทั่วไป (คิว, อนุมัติ, แดชบอร์ด) จึงแยกเป็นแอปอิสระ
> รันพอร์ตต่างกัน แต่ทั้งคู่คุยกับ backend เดียวกันผ่าน API เดียวกัน — ข้อมูลจึงเชื่อมโยงกัน
> ผู้ใช้ทั่วไปจะไม่เห็นเมนูพยาบาล/admin อีกต่อไป

---

## 🚀 วิธีติดตั้งและรัน

### ข้อกำหนดเบื้องต้น
- Node.js 18+
- npm
- (ไม่ต้องติดตั้ง SQLite แยก — ใช้ `better-sqlite3` ในตัว)

### ขั้นตอนที่ 1: ติดตั้ง dependencies

```bash
# Backend
cd backend
npm install

# ถ้าเจอ error เรื่อง better-sqlite3 binding:
npm install-scripts approve better-sqlite3   # macOS ใหม่
# หรือ
npm rebuild better-sqlite3

# Frontend (ผู้ใช้)
cd ../frontend
npm install

# Staff app (พยาบาล + admin)
cd ../staff
npm install
```

### ขั้นตอนที่ 2: ตั้งค่าไฟล์ .env

**backend/.env** (ดู `.env.example`):

```env
PORT=4000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:3000
COOKIE_NAME=nudmedi_session
COOKIE_SECURE=false
SESSION_TTL_HOURS=12
DB_PATH=./data/nudmedi.db
OTP_TTL_MINUTES=5

# Gmail SMTP (สำหรับส่ง OTP ทางอีเมล)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=your.email@gmail.com
```

> 💡 **วิธีสร้าง App Password ของ Gmail:**
> 1. เปิด [Google Account](https://myaccount.google.com/) → ความปลอดภัย → เปิด 2-Step Verification
> 2. ไปที่ [App Passwords](https://myaccount.google.com/apppasswords)
> 3. สร้าง App Password → เอามาใส่ใน `SMTP_PASS`

> 💡 **OpenRouter API Key:** ถ้าไม่ใส่ใน `.env` จะไปดูในตาราง `system_settings` (ตั้งค่าได้จากหน้า admin → ตั้งค่าระบบ)

**frontend/.env.local** และ **staff/.env.local** (ดู `.env.local.example` ในแต่ละโฟลเดอร์):

```env
BACKEND_ORIGIN=http://localhost:4000
```

### ขั้นตอนที่ 3: รันระบบ

**วิธีง่าย (สคริปต์):**
```bash
./run_system.sh     # เริ่ม backend (4000) + frontend (3000) + staff (3001)
./stop_system.sh    # หยุดทั้งหมด
```

**วิธีแยก:**
```bash
# Terminal 1 — Backend
cd backend
npm run dev         # http://localhost:4000

# Terminal 2 — Frontend (ผู้ใช้)
cd frontend
npm run dev         # http://localhost:3000

# Terminal 3 — Staff (พยาบาล + admin)
cd staff
npm run dev         # http://localhost:3001
```

เปิดเบราว์เซอร์:
- **ผู้ใช้:** http://localhost:3000
- **พยาบาล / Admin:** http://localhost:3001 (เข้า `/nurse/login` หรือ `/admin`)

---

## 🧪 บัญชีทดสอบ

| บทบาท | อีเมล | รหัสผ่าน |
|-------|-------|---------|
| Admin | `natchapon22105@gmail.com` | (รหัสผ่านที่ตั้งไว้ตอนสมัคร) |
| Nurse | `approyal624@gmail.com` | (รหัสผ่านที่ตั้งไว้ตอนสมัคร) |
| User | สมัครใหม่ได้เลย | — |

> สร้าง admin คนแรก: สมัครสมาชิกปกติ แล้วแก้ role ใน DB เป็น `admin` หรือผ่าน SQL:
> ```sql
> UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
> ```

---

## 📚 คู่มือการใช้งาน

### 👤 ผู้ใช้ (User)
1. **สมัครสมาชิก** → ยืนยัน OTP ทางอีเมล → เข้าสู่ระบบ
2. ไปที่ **โปรไฟล์** → สแกนบัตรประชาชน (OCR) หรือกรอกข้อมูลส่วนตัว + ข้อมูลสุขภาพ
3. ไปที่ **จองคิว** → พิมพ์/พูดอาการ (หรืออัปโหลดรูป) → ตอบคำถาม AI 5 ข้อ
4. ดูผลวิเคราะห์ (แผนกที่แนะนำ, ระดับความเร่งด่วน) → เลือกวันและเวลา → ยืนยันการจอง

### 🧑‍⚕️ พยาบาล (Nurse) — แอป `staff` (พอร์ต 3001)
1. เข้า `http://localhost:3001/nurse/register` → ลงทะเบียน รอ admin อนุมัติ
2. เข้า `http://localhost:3001/nurse/login` → เข้าสู่ระบบ
3. เลือกวันที่ → ดูรายการคิว → กด **เช็คอิน / เสร็จสิ้น / ยกเลิก** ตามสถานะคนไข้

### 🛠️ ผู้ดูแลระบบ (Admin) — แอป `staff` (พอร์ต 3001)
- เข้า `http://localhost:3001/admin`
- **แดชบอร์ด:** ดูสถิติการจอง, คนไข้, รายการล่าสุด
- **ตั้งค่าระบบ:** จำนวนคิว/ชั่วโมง, AI model, OpenRouter API key, เวลาเปิด-ปิด, ระยะเวลาต่อคิว
- **สถิติการใช้งาน:** ผู้ใช้, การจอง, กราฟรายเดือน
- **จัดการพยาบาล:**
  - อนุมัติ/ปฏิเสธคำขอสมัครพยาบาล
  - ดูสถานะ **ออนไลน์/ออฟไลน์** (จุดเขียว = ใช้งานภายใน 5 นาที)
  - ดูจำนวนกิจกรรมวันนี้
  - **ลบ** พยาบาลออกจากระบบ

---

## 🔌 API Endpoints

### Auth (`/api/auth`)
| Method | Path | คำอธิบาย |
|--------|------|---------|
| POST | `/register` | สมัครสมาชิก (ส่ง OTP) |
| POST | `/verify-otp` | ยืนยัน OTP |
| POST | `/login` | เข้าสู่ระบบ |
| POST | `/logout` | ออกจากระบบ |
| GET | `/me` | ข้อมูลผู้ใช้ปัจจุบัน |
| POST | `/forgot-password` | ขอ OTP รีเซ็ตรหัสผ่าน |
| POST | `/reset-password` | รีเซ็ตรหัสผ่านด้วย OTP |

### Booking (`/api/booking`)
| Method | Path | คำอธิบาย |
|--------|------|---------|
| POST | `/analyze` | AI ถามคำถามจากอาการ |
| POST | `/analyze-followup` | AI วิเคราะห์ขั้นสุดท้าย |
| POST | `/confirm` | บันทึกการจอง + วัน/เวลา |
| GET | `/available-slots?date=` | ดูเวลาว่าง |
| GET | `/history` | ประวัติการจอง |

### Patient (`/api/patient`)
| Method | Path | คำอธิบาย |
|--------|------|---------|
| GET | `/profile` | ดูโปรไฟล์ |
| PUT | `/profile` | อัปเดตโปรไฟล์ |

### OCR (`/api/ocr`)
| Method | Path | คำอธิบาย |
|--------|------|---------|
| POST | `/id-card` | สแกนบัตรประชาชน (AI Vision) |

### Nurse (`/api/nurse`)
| Method | Path | คำอธิบาย |
|--------|------|---------|
| GET | `/queue?date=` | ดูคิวรายวัน |
| PUT | `/queue/:id/status` | เปลี่ยนสถานะคิว |

### Nurse Auth (`/api/nurse-auth`)
| Method | Path | คำอธิบาย |
|--------|------|---------|
| POST | `/register` | ลงทะเบียนพยาบาล (รออนุมัติ) |
| POST | `/login` | เข้าสู่ระบบพยาบาล |
| GET | `/pending` | คำขอที่รออนุมัติ (admin) |
| GET | `/all` | พยาบาลทั้งหมด + สถานะออนไลน์ (admin) |
| POST | `/approve/:id` | อนุมัติ (admin) |
| POST | `/reject/:id` | ปฏิเสธ (admin) |
| DELETE | `/delete/:id` | ลบพยาบาล (admin) |
| GET | `/activity/:id` | ประวัติกิจกรรม (admin) |

### Admin (`/api/admin`)
| Method | Path | คำอธิบาย |
|--------|------|---------|
| GET | `/dashboard` | สถิติแดชบอร์ด |
| GET/PUT | `/settings` | ดู/แก้ไขการตั้งค่า |
| GET | `/usage` | สถิติการใช้งาน |

---

## ⚙️ การปรับแต่งระบบ

### 1. แก้ข้อความ AI หรือ prompt
ไฟล์: `backend/src/utils/ai.service.ts`
- เปลี่ยน prompt วิเคราะห์อาการ / คำถาม / ภาษา

### 2. เปลี่ยน AI model
- หน้า Admin → ตั้งค่าระบบ → AI Model (gpt-4o-mini, gpt-4o, claude-3 ฯลฯ)
- หรือแก้ค่าเริ่มต้นใน `backend/src/db/db.ts` (ตาราง `system_settings`)

### 3. เปลี่ยนจำนวนคิว/เวลาทำการ
- หน้า Admin → ตั้งค่าระบบ: `max_queue_per_hour`, `business_hours_start/end`, `slot_duration_minutes`
- การคำนวณเวลาว่างอยู่ใน `backend/src/controllers/booking.controller.ts`

### 4. เปลี่ยนสี / ธีม
ไฟล์: `frontend/app/globals.css` + `frontend/tailwind.config.ts` (และ `staff/` ในทำนองเดียวกัน)
- สีหลัก (teal) อยู่ใน `tailwind.config.ts` → `colors.teal`
- คลาส CSS เช่น `.gradient-text`, `.btn-primary`, `.card`, `.field-input` อยู่ใน `globals.css`

### 5. เปลี่ยนพื้นหลัง / โลโก้
- วางไฟล์ใน `frontend/public/` หรือ `staff/public/` แล้วอ้างอิงในหน้า (`/logo.png`, `/usebackground.png`, `/bg-booking.png`)

### 6. ระยะเวลาที่ถือว่า "ออนไลน์" ของพยาบาล
ไฟล์: `backend/src/controllers/nurse-auth.controller.ts`
- ค่าปัจจุบัน: `5 * 60 * 1000` (5 นาที) ในฟังก์ชัน `getAllNurses`

### 7. เพิ่มตาราง/คอลัมน์ในฐานข้อมูล
ไฟล์: `backend/src/db/db.ts`
- Schema ใช้ pattern migration: `db.exec("ALTER TABLE ...")` ใน try/catch — ระบบจะ migrate อัตโนมัติตอนสตาร์ท

---

## 📤 การ push ขึ้น GitHub

### วิธีที่ 1: สคริปต์ `push.sh` (แนะนำ)

```bash
./push.sh "ข้อความ commit ของคุณ"
```

สคริปต์จะ:
1. แสดงไฟล์ที่เปลี่ยนแปลง
2. ถามว่าจะดู diff หรือไม่
3. ถามยืนยันก่อน push
4. `git add -A` → `git commit` → `git push origin main`

### วิธีที่ 2: git ตรง ๆ

```bash
git add .
git commit -m "ข้อความ"
git push origin main
```

> 🔒 **ความปลอดภัย:** ไฟล์ `.env`, `.env.local`, `*.db`, `node_modules` ถูก ignore ไว้แล้ว — **API key และฐานข้อมูลจะไม่ถูก push ขึ้น GitHub**

---

## 🛠️ การแก้ปัญหาที่พบบ่อย

| ปัญหา | วิธีแก้ |
|-------|--------|
| `better-sqlite3` binding error | `npm install-scripts approve better-sqlite3` แล้ว `npm rebuild better-sqlite3` |
| OTP ส่งไม่ออก (500) | เช็คว่า backend รันอยู่, เช็ค SMTP ใน `.env` |
| login ไม่ได้ (403) | เช็ค session cookie / middleware |
| API key ไม่ทำงาน | ตั้งค่าที่หน้า Admin → ตั้งค่าระบบ → OpenRouter API Key |
| port ซ้ำ | `lsof -ti:4000 \| xargs kill -9` แล้วรันใหม่ |

---

## 📄 License

MIT — โปรเจกต์เพื่อการศึกษา (ระบบจองคิวโรงพยาบาลจำลอง)

---

<p align="center">
  Made with ❤️ for Thai healthcare
</p>