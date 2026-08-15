import nodemailer from "nodemailer";

// Lazy accessors – read from process.env at call time, so dotenv.config()
// in server.ts has already run by the time these are invoked.
function smtpUser(): string {
  return process.env.SMTP_USER || "";
}
function smtpPass(): string {
  return process.env.SMTP_PASS || "";
}
function smtpHost(): string {
  return process.env.SMTP_HOST || "smtp.gmail.com";
}
function smtpPort(): number {
  return Number(process.env.SMTP_PORT || 587);
}
function fromAddr(): string {
  return process.env.SMTP_FROM || smtpUser();
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  if (!smtpUser() || !smtpPass()) return null;

  transporter = nodemailer.createTransport({
    host: smtpHost(),
    port: smtpPort(),
    secure: smtpPort() === 465,
    auth: { user: smtpUser(), pass: smtpPass() },
  });

  return transporter;
}

/** Generic send with optional PDF attachment. Falls back to console.log. */
async function sendWithAttachment(
  to: string,
  subject: string,
  html: string,
  text: string,
  attachment?: { filename: string; content: Buffer }
): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.log(`[MOCK EMAIL] ${subject} → ${to}`);
    if (attachment) console.log(`[MOCK EMAIL] (with attachment: ${attachment.filename}, ${attachment.content.length} bytes)`);
    return;
  }
  await t.sendMail({
    from: `"NudMedi" <${fromAddr()}>`,
    to,
    subject,
    text,
    html: html.trim(),
    attachments: attachment ? [{ filename: attachment.filename, content: attachment.content }] : undefined,
  }).catch((mailErr) => {
    console.error("[MAIL] send failed:", mailErr);
    throw mailErr;
  });
}

/**
 * Sends an OTP code to the given email address.
 */
export async function sendOtpEmail(
  to: string,
  code: string,
  purpose: "register" | "login" | "password_reset"
): Promise<void> {
  const subject = purpose === "register" ? "รหัสยืนยันสมัครสมาชิก NudMedi" : "รหัสเข้าสู่ระบบ NudMedi";
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#0d9488;">NudMedi</h2>
      <p>รหัส OTP ของคุณคือ</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#0d9488;">${code}</p>
      <p style="color:#666;">รหัสนี้ใช้ได้ภายใน 5 นาที</p>
      <hr style="border:none;border-top:1px solid #eee;" />
      <p style="font-size:12px;color:#999;">หากคุณไม่ได้ขอรหัสนี้ กรุณาละเว้นอีเมลนี้</p>
    </div>`;
  const text = `รหัส OTP ของคุณคือ ${code}\n\nรหัสนี้ใช้ได้ภายใน 5 นาที\n\nหากคุณไม่ได้ขอรหัสนี้ กรุณาละเว้นอีเมลนี้`;
  await sendWithAttachment(to, subject, html, text);
}

/**
 * Sends a lab result notification email with optional PDF attachment.
 */
export async function sendLabResultEmail(
  to: string,
  data: {
    patientName: string;
    testName: string;
    testDate: string;
    flag: string;
    resultValue?: string | null;
    unit?: string | null;
    refRange?: string | null;
    note?: string | null;
    doctorName?: string | null;
  },
  pdfBuffer?: Buffer
): Promise<void> {
  const flagLabel: Record<string, string> = { normal: "ปกติ", high: "สูงกว่าเกณฑ์", low: "ต่ำกว่าเกณฑ์", critical: "วิกฤต" };
  const flagText = flagLabel[data.flag] || "ปกติ";
  const resultLine = data.resultValue ? `<p style="font-size:20px;font-weight:bold;color:#0d9488;">${data.resultValue}${data.unit ? " " + data.unit : ""}</p>` : "";
  const refLine = data.refRange ? `<p style="color:#666;">เกณฑ์ปกติ: ${data.refRange}</p>` : "";
  const noteLine = data.note ? `<div style="margin-top:12px;padding:12px;background:#f4f7f6;border-radius:8px;"><p style="margin:0;color:#333;"><strong>หมายเหตุจากแพทย์:</strong> ${data.note}</p></div>` : "";

  const subject = `แจ้งผลตรวจ: ${data.testName}`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#0d9488;">NudMedi</h2>
      <p>เรียน ${data.patientName}</p>
      <p>ผลการตรวจของคุณพร้อมแล้ว</p>
      <div style="padding:16px;background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;">
        <p style="margin:0;color:#666;font-size:13px;">การตรวจ</p>
        <p style="margin:4px 0 8px;font-size:18px;font-weight:bold;color:#142625;">${data.testName}</p>
        ${resultLine}${refLine}
        <p style="color:#666;font-size:13px;">สถานะ: <strong>${flagText}</strong></p>
        <p style="color:#999;font-size:12px;">วันที่ตรวจ: ${data.testDate}</p>
        ${data.doctorName ? `<p style="color:#999;font-size:12px;">ผู้ออกผล: ${data.doctorName}</p>` : ""}
      </div>
      ${noteLine}
      ${pdfBuffer ? '<p style="margin-top:12px;color:#0d9488;">📎 ไฟล์ PDF แนบมาพร้อมอีเมลนี้</p>' : ""}
      <p style="margin-top:16px;color:#666;">กรุณาเข้าสู่ระบบ NudMedi เพื่อดูรายละเอียดเพิ่มเติม</p>
      <hr style="border:none;border-top:1px solid #eee;" />
      <p style="font-size:12px;color:#999;">อีเมลนี้ส่งโดยอัตโนมัติจากระบบ NudMedi</p>
    </div>`;
  const text = `เรียน ${data.patientName}\n\nผลตรวจ "${data.testName}" วันที่ ${data.testDate} สถานะ: ${flagText}\n${data.resultValue ? `ผล: ${data.resultValue}${data.unit ? " " + data.unit : ""}` : ""}\n\nกรุณาเข้าสู่ระบบ NudMedi เพื่อดูรายละเอียดเพิ่มเติม`;
  await sendWithAttachment(to, subject, html, text, pdfBuffer ? { filename: `result_${data.testName.replace(/[^a-zA-Z0-9ก-๙]/g, "_")}.pdf`, content: pdfBuffer } : undefined);
}

/**
 * Sends a booking confirmation / queue ticket email with optional PDF attachment.
 */
export async function sendBookingConfirmationEmail(
  to: string,
  data: {
    patientName: string;
    queueNumber: string;
    department: string;
    appointmentDate: string;
    appointmentTime: string;
    urgency: string;
  },
  pdfBuffer?: Buffer
): Promise<void> {
  const urgencyLabel = data.urgency === "emergency" ? "ฉุกเฉิน" : data.urgency === "urgent" ? "เร่งด่วน" : "ทั่วไป";
  const subject = `ยืนยันการจองคิว NudMedi — ${data.department}`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#0d9488;">NudMedi</h2>
      <p>เรียน ${data.patientName}</p>
      <p>การจองคิวของคุณได้รับการยืนยันแล้ว</p>
      <div style="padding:16px;background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;text-align:center;">
        <p style="margin:0;color:#666;font-size:13px;">หมายเลขคิว</p>
        <p style="margin:4px 0;font-size:32px;font-weight:bold;color:#0d9488;letter-spacing:4px;">${data.queueNumber}</p>
      </div>
      <div style="margin-top:12px;padding:16px;background:#f4f7f6;border-radius:10px;">
        <p style="margin:4px 0;"><strong>แผนก:</strong> ${data.department}</p>
        <p style="margin:4px 0;"><strong>วันที่:</strong> ${data.appointmentDate}</p>
        <p style="margin:4px 0;"><strong>เวลา:</strong> ${data.appointmentTime} น.</p>
        <p style="margin:4px 0;"><strong>ระดับ:</strong> ${urgencyLabel}</p>
      </div>
      ${pdfBuffer ? '<p style="margin-top:12px;color:#0d9488;">📎 บัตรคิว PDF แนบมาพร้อมอีเมลนี้</p>' : ""}
      <p style="margin-top:16px;color:#666;">กรุณาแสดงบัตรคิวที่โรงพยาบาลในวันนัดหมาย</p>
      <hr style="border:none;border-top:1px solid #eee;" />
      <p style="font-size:12px;color:#999;">อีเมลนี้ส่งโดยอัตโนมัติจากระบบ NudMedi</p>
    </div>`;
  const text = `เรียน ${data.patientName}\n\nการจองคิวของคุณได้รับการยืนยัน\nหมายเลขคิว: ${data.queueNumber}\nแผนก: ${data.department}\nวันที่: ${data.appointmentDate}\nเวลา: ${data.appointmentTime} น.\n\nกรุณาแสดงบัตรคิวที่โรงพยาบาลในวันนัดหมาย`;
  await sendWithAttachment(to, subject, html, text, pdfBuffer ? { filename: `ticket_${data.queueNumber}.pdf`, content: pdfBuffer } : undefined);
}

/**
 * Sends an appointment notification email with optional PDF attachment.
 */
export async function sendAppointmentEmail(
  to: string,
  data: {
    patientName: string;
    department: string;
    appointmentDate: string;
    appointmentTime: string;
    note?: string | null;
  },
  pdfBuffer?: Buffer
): Promise<void> {
  const subject = `แจ้งนัดหมาย NudMedi — ${data.department}`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#0d9488;">NudMedi</h2>
      <p>เรียน ${data.patientName}</p>
      <p>คุณมีนัดหมายกับทางโรงพยาบาล</p>
      <div style="margin-top:12px;padding:16px;background:#f4f7f6;border-radius:10px;">
        <p style="margin:4px 0;"><strong>แผนก:</strong> ${data.department}</p>
        <p style="margin:4px 0;"><strong>วันที่นัด:</strong> ${data.appointmentDate}</p>
        <p style="margin:4px 0;"><strong>เวลา:</strong> ${data.appointmentTime} น.</p>
      </div>
      ${data.note ? `<div style="margin-top:12px;padding:12px;background:#f4f7f6;border-radius:8px;"><p style="margin:0;color:#333;"><strong>หมายเหตุ:</strong> ${data.note}</p></div>` : ""}
      ${pdfBuffer ? '<p style="margin-top:12px;color:#0d9488;">📎 เอกสารนัดหมาย PDF แนบมาพร้อมอีเมลนี้</p>' : ""}
      <p style="margin-top:16px;color:#666;">กรุณามาตามวันและเวลาที่นัดหมาย</p>
      <hr style="border:none;border-top:1px solid #eee;" />
      <p style="font-size:12px;color:#999;">อีเมลนี้ส่งโดยอัตโนมัติจากระบบ NudMedi</p>
    </div>`;
  const text = `เรียน ${data.patientName}\n\nคุณมีนัดหมายกับทางโรงพยาบาล\nแผนก: ${data.department}\nวันที่: ${data.appointmentDate}\nเวลา: ${data.appointmentTime} น.\n\nกรุณามาตามวันและเวลาที่นัดหมาย`;
  await sendWithAttachment(to, subject, html, text, pdfBuffer ? { filename: `appointment_${data.department.replace(/[^a-zA-Z0-9ก-๙]/g, "_")}.pdf`, content: pdfBuffer } : undefined);
}