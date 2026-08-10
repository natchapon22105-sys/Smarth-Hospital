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

  await t.sendMail({
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
          หากคุณไม่ได้ขอรหัสนี้ กรุณาละเว้นอีเมลนี้
        </p>
      </div>
    `.trim(),
  });
}