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

/**
 * Sends an OTP code to the given email address.
 *
 * Falls back to console.log if SMTP is not configured (same as previous
 * mock-SMS behaviour), so the app works in development without credentials.
 */
export async function sendOtpEmail(
  to: string,
  code: string,
  purpose: "register" | "login" | "password_reset"
): Promise<void> {
  const t = getTransporter();

  if (!t) {
    // eslint-disable-next-line no-console
    console.log(`[MOCK EMAIL] OTP for ${to} (${purpose}): ${code}`);
    return;
  }

  const subject =
    purpose === "register"
      ? "รหัสยืนยันสมัครสมาชิก NudMedi"
      : "รหัสเข้าสู่ระบบ NudMedi";

  await t
    .sendMail({
      from: `"NudMedi" <${fromAddr()}>`,
      to,
      subject,
      text: `รหัส OTP ของคุณคือ ${code}\n\nรหัสนี้ใช้ได้ภายใน 5 นาที\n\nหากคุณไม่ได้ขอรหัสนี้ กรุณาละเว้นอีเมลนี้`,
      html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#0d9488;">NudMedi</h2>
        <p>รหัส OTP ของคุณคือ</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#0d9488;">${code}</p>
        <p style="color:#666;">รหัสนี้ใช้ได้ภายใน 5 นาที</p>
        <hr style="border:none;border-top:1px solid #eee;" />
        <p style="font-size:12px;color:#999;">
          หากคุณไม่ได้ขอรหัสนี้ กรุณาละเวันอีเมลนี้
        </p>
      </div>
    `.trim(),
    })
    .catch((mailErr) => {
      console.error("[MAIL] sendOtpEmail failed:", mailErr);
      throw mailErr;
    });
}

/**
 * Sends a lab result notification email to a patient.
 *
 * Falls back to console.log if SMTP is not configured.
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
  }
): Promise<void> {
  const t = getTransporter();

  const flagLabel: Record<string, string> = {
    normal: "ปกติ",
    high: "สูงกว่าเกณฑ์",
    low: "ต่ำกว่าเกณฑ์",
    critical: "วิกฤต",
  };
  const flagText = flagLabel[data.flag] || "ปกติ";

  if (!t) {
    // eslint-disable-next-line no-console
    console.log(
      `[MOCK EMAIL] Lab result for ${to}: ${data.testName} (${flagText}) ${data.resultValue ?? ""}`
    );
    return;
  }

  const resultLine = data.resultValue
    ? `<p style="font-size:20px;font-weight:bold;color:#0d9488;">${data.resultValue}${
        data.unit ? " " + data.unit : ""
      }</p>`
    : "";

  const refLine = data.refRange
    ? `<p style="color:#666;">เกณฑ์ปกติ: ${data.refRange}</p>`
    : "";

  const noteLine = data.note
    ? `<div style="margin-top:12px;padding:12px;background:#f4f7f6;border-radius:8px;">
         <p style="margin:0;color:#333;"><strong>หมายเหตุจากแพทย์:</strong> ${data.note}</p>
       </div>`
    : "";

  await t
    .sendMail({
      from: `"NudMedi" <${fromAddr()}>`,
      to,
      subject: `แจ้งผลตรวจ: ${data.testName}`,
      text: `เรียน ${data.patientName}\n\nผลตรวจ "${data.testName}" วันที่ ${data.testDate} สถานะ: ${flagText}\n${
        data.resultValue ? `ผล: ${data.resultValue}${data.unit ? " " + data.unit : ""}` : ""
      }\n\nกรุณาเข้าสู่ระบบ NudMedi เพื่อดูรายละเอียดเพิ่มเติม`,
      html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#0d9488;">NudMedi</h2>
        <p>เรียน ${data.patientName}</p>
        <p>ผลการตรวจของคุณพร้อมแล้ว</p>
        <div style="padding:16px;background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;">
          <p style="margin:0;color:#666;font-size:13px;">การตรวจ</p>
          <p style="margin:4px 0 8px;font-size:18px;font-weight:bold;color:#142625;">${data.testName}</p>
          ${resultLine}
          ${refLine}
          <p style="color:#666;font-size:13px;">สถานะ: <strong>${flagText}</strong></p>
          <p style="color:#999;font-size:12px;">วันที่ตรวจ: ${data.testDate}</p>
          ${data.doctorName ? `<p style="color:#999;font-size:12px;">ผู้ออกผล: ${data.doctorName}</p>` : ""}
        </div>
        ${noteLine}
        <p style="margin-top:16px;color:#666;">กรุณาเข้าสู่ระบบ NudMedi เพื่อดูรายละเอียดเพิ่มเติม</p>
        <hr style="border:none;border-top:1px solid #eee;" />
        <p style="font-size:12px;color:#999;">อีเมลนี้ส่งโดยอัตโนมัติจากระบบ NudMedi</p>
      </div>
    `.trim(),
    })
    .catch((mailErr) => {
      console.error("[MAIL] sendLabResultEmail failed:", mailErr);
      throw mailErr;
    });
}