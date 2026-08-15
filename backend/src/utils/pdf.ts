import PDFDocument from "pdfkit";
import * as path from "path";

// ---------------------------------------------------------------------------
// PDF Helpers — generate PDFs as Buffers for email attachment
// ---------------------------------------------------------------------------

const FONT_REGULAR = path.resolve(__dirname, "../../assets/fonts/Sarabun-Regular.ttf");
const FONT_BOLD = path.resolve(__dirname, "../../assets/fonts/Sarabun-Bold.ttf");
const LOGO_PATH = path.resolve(__dirname, "../../assets/logo-small.png");
const BG_PATH = path.resolve(__dirname, "../../assets/bg-small.jpg");

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2; // 515.28

/** Wraps PDFDocument in a Promise — data events fire asynchronously after end() */
function renderPdf(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: "A4" });
    doc.registerFont("Sarabun", FONT_REGULAR);
    doc.registerFont("Sarabun-Bold", FONT_BOLD);
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Draw background on first page
    drawBackground(doc);

    build(doc);
    doc.end();
  });
}

// ─── Background ──────────────────────────────────────────────────────────────

function drawBackground(doc: PDFKit.PDFDocument) {
  try {
    // Use explicit width/height — keeps Y cursor at original position
    doc.image(BG_PATH, 0, 0, { width: PAGE_W, height: PAGE_H });
  } catch {
    // ignore if bg not found
  }
  // Dark overlay fills entire page
  doc.save();
  doc.rect(0, 0, PAGE_W, PAGE_H).fillColor("#000000", 0.35).fill();
  doc.restore();
}

// ─── Header: centered logo + title bar ───────────────────────────────────────

function drawHeader(doc: PDFKit.PDFDocument, subtitle: string) {
  // Solid white bar behind header
  doc.save();
  doc.rect(0, 0, PAGE_W, 100).fillColor("#FFFFFF").fill();
  doc.restore();

  // Centered logo
  try {
    doc.image(LOGO_PATH, PAGE_W / 2 - 18, 10, { width: 34 });
  } catch {
    // ignore
  }

  // Title
  doc.font("Sarabun-Bold").fontSize(18).fillColor("#0E7C7B").text("NudMedi", MARGIN, 48, { align: "center" });
  doc.font("Sarabun").fontSize(12).fillColor("#0E7C7B").text(subtitle, MARGIN, 70, { align: "center" });

  // Decorative line under header
  doc.save();
  doc.moveTo(80, 98).lineTo(PAGE_W - 80, 98).lineWidth(1.5).strokeColor("#0E7C7B", 0.5).stroke();
  doc.restore();
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function drawFooter(doc: PDFKit.PDFDocument, text: string) {
  const footerY = PAGE_H - MARGIN - 45;
  doc.save();
  doc.rect(0, footerY, PAGE_W, 45).fillColor("#FFFFFF").fill();
  doc.restore();
  doc.font("Sarabun").fontSize(9).fillColor("#666").text(text, MARGIN, footerY + 14, { align: "center" });
}

// ─── Content card (solid white panel) ────────────────────────────────────────

function startCard(doc: PDFKit.PDFDocument, top: number): number {
  const pad = 16;
  const cardTop = top;
  const cardH = PAGE_H - cardTop - 45;
  doc.save();
  doc.rect(MARGIN, cardTop, CONTENT_W, cardH).fillColor("#FFFFFF").fill();
  doc.restore();
  return cardTop + pad;
}

// ─── Section title ───────────────────────────────────────────────────────────

function sectionTitle(doc: PDFKit.PDFDocument, text: string, y: number): number {
  doc.font("Sarabun-Bold").fontSize(12).fillColor("#0E7C7B").text(text, MARGIN + 20, y);
  doc.save();
  doc.moveTo(MARGIN + 20, y + 18).lineTo(MARGIN + 20 + 140, y + 18).lineWidth(1.5).strokeColor("#0E7C7B", 0.6).stroke();
  doc.restore();
  return y + 26;
}

// ─── Labeled row ─────────────────────────────────────────────────────────────

function drawRow(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  valueColor?: string
): number {
  doc.font("Sarabun-Bold").fontSize(10).fillColor("#1E293B").text(label, x, y, { continued: true });
  doc.font("Sarabun").fillColor(valueColor || "#0F172A").text(value, x + 110, y);
  return y + 18;
}

// ─── Info box (colored background for emphasis) ──────────────────────────────

function infoBox(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  bgColor: string,
  textColor: string
): number {
  const w = CONTENT_W - 40;
  const h = 28;
  doc.save();
  doc.rect(x, y, w, h).fillColor(bgColor).fill();
  doc.restore();
  doc.font("Sarabun-Bold").fontSize(10).fillColor(textColor).text(label, x + 10, y + 6, { continued: true });
  doc.font("Sarabun-Bold").fillColor(textColor).text(value, x + 10 + 80, y + 6);
  return y + h + 6;
}

// ─── Note box ────────────────────────────────────────────────────────────────

function noteBox(doc: PDFKit.PDFDocument, title: string, text: string, x: number, y: number): number {
  const w = CONTENT_W - 40;
  doc.save();
  doc.rect(x, y, w, 26).fillColor("#F0F9F6").fill();
  doc.restore();
  doc.font("Sarabun-Bold").fontSize(10).fillColor("#0E7C7B").text(title, x + 10, y + 6);
  doc.font("Sarabun").fontSize(9).fillColor("#334155").text(text, x + 10, y + 22, { width: w - 20 });
  const textH = doc.heightOfString(text, { width: w - 20 });
  return y + 26 + textH + 8;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  1. Lab Result PDF
// ═══════════════════════════════════════════════════════════════════════════════

export function generateLabResultPdf(data: {
  patientName: string;
  nationalId?: string | null;
  testName: string;
  testDate: string;
  category: string;
  resultValue?: string | null;
  unit?: string | null;
  refRange?: string | null;
  flag: string;
  flagLabel: string;
  note?: string | null;
  doctorName?: string | null;
}): Promise<Buffer> {
  return renderPdf((doc) => {
    drawBackground(doc);
    drawHeader(doc, "ผลการตรวจ");

    let y = startCard(doc, 115);
    const x = MARGIN + 20;
    y = sectionTitle(doc, "ข้อมูลผู้ป่วย", y);
    y = drawRow(doc, "ชื่อผู้ป่วย:", data.patientName, x, y);
    if (data.nationalId) y = drawRow(doc, "เลขบัตร:", data.nationalId, x, y);
    y += 8;

    // Test details section
    y = sectionTitle(doc, "รายละเอียดผลตรวจ", y);
    y = drawRow(doc, "ชื่อการตรวจ:", data.testName, x, y);
    y = drawRow(doc, "วันที่ตรวจ:", data.testDate, x, y);

    if (data.resultValue) {
      y = drawRow(doc, "ผลตรวจ:", `${data.resultValue}${data.unit ? " " + data.unit : ""}`, x, y);
    }
    if (data.refRange) {
      y = drawRow(doc, "เกณฑ์ปกติ:", data.refRange, x, y);
    }

    // Flag — colored info box
    const flagBg =
      data.flag === "critical" ? "#FEF2F2" : data.flag === "high" || data.flag === "low" ? "#FFFBEB" : "#F0FDF4";
    const flagTextColor =
      data.flag === "critical" ? "#991B1B" : data.flag === "high" || data.flag === "low" ? "#92400E" : "#166534";
    y = infoBox(doc, "สถานะ:", data.flagLabel, x, y, flagBg, flagTextColor);

    if (data.doctorName) {
      y = drawRow(doc, "ผู้ออกผล:", data.doctorName, x, y);
    }

    // Note
    if (data.note) {
      y += 4;
      y = noteBox(doc, "📋 หมายเหตุ", data.note, x, y);
    }

    drawFooter(doc, "ออกโดยอัตโนมัติจากระบบ NudMedi");
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  2. Booking Ticket PDF
// ═══════════════════════════════════════════════════════════════════════════════

export function generateBookingTicketPdf(data: {
  patientName: string;
  queueNumber: string;
  department: string;
  appointmentDate: string;
  appointmentTime: string;
  urgency: string;
  symptoms?: string | null;
  note?: string | null;
}): Promise<Buffer> {
  return renderPdf((doc) => {
    drawBackground(doc);
    drawHeader(doc, "บัตรคิว / ใบนัดหมาย");

    let y = startCard(doc, 115);
    const x = MARGIN + 20;

    // Queue number — big centered badge
    doc.save();
    const badgeW = 180;
    const badgeH = 52;
    const badgeX = PAGE_W / 2 - badgeW / 2;
    doc.rect(badgeX, y, badgeW, badgeH).fillColor("#0E7C7B").fill();
    doc.restore();
    doc.font("Sarabun-Bold").fontSize(26).fillColor("#FFFFFF").text(data.queueNumber, badgeX, y + 8, { align: "center" });
    doc.font("Sarabun").fontSize(10).fillColor("#FFFFFF", 0.85).text("หมายเลขคิว", badgeX, y + 38, { align: "center" });
    y += badgeH + 14;

    // Details
    y = sectionTitle(doc, "รายละเอียดการนัดหมาย", y);

    const urgencyLabel =
      data.urgency === "emergency"
        ? "ฉุกเฉิน"
        : data.urgency === "urgent"
          ? "เร่งด่วน"
          : data.urgency === "routine"
            ? "ทั่วไป"
            : "ไม่เร่งด่วน";

    y = drawRow(doc, "ชื่อผู้ป่วย:", data.patientName, x, y);
    y = drawRow(doc, "แผนก:", data.department, x, y);
    y = drawRow(doc, "วันที่นัด:", data.appointmentDate, x, y);
    y = drawRow(doc, "เวลา:", `${data.appointmentTime} น.`, x, y);
    y = drawRow(doc, "ความเร่งด่วน:", urgencyLabel, x, y);

    if (data.symptoms) {
      y += 4;
      doc.font("Sarabun-Bold").fontSize(11).fillColor("#1E293B").text("อาการ:", x, y);
      y += 20;
      doc.font("Sarabun").fontSize(10).fillColor("#0F172A").text(data.symptoms, x + 20, y, { width: CONTENT_W - 80 });
      y = doc.y + 12;
    }

    if (data.note) {
      y += 4;
      y = noteBox(doc, "📋 หมายเหตุ", data.note, x, y);
    }

    drawFooter(doc, "กรุณานำบัตรคิวนี้ไปแสดงที่โรงพยาบาลในวันนัดหมาย");
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3. Appointment Notification PDF
// ═══════════════════════════════════════════════════════════════════════════════

export function generateAppointmentPdf(data: {
  patientName: string;
  department: string;
  appointmentDate: string;
  appointmentTime: string;
  note?: string | null;
}): Promise<Buffer> {
  return renderPdf((doc) => {
    drawBackground(doc);
    drawHeader(doc, "แจ้งนัดหมาย");

    let y = startCard(doc, 115);
    const x = MARGIN + 20;

    // Appointment icon / decorative element
    doc.save();
    doc.rect(x, y, CONTENT_W - 40, 36).fillColor("#0E7C7B", 0.08).fill();
    doc.restore();
    doc.font("Sarabun-Bold").fontSize(12).fillColor("#0E7C7B").text("📅 คุณมีนัดหมายกับทางโรงพยาบาล", x + 10, y + 9);
    y += 48;

    y = sectionTitle(doc, "รายละเอียดนัดหมาย", y);
    y = drawRow(doc, "ชื่อผู้ป่วย:", data.patientName, x, y);
    y = drawRow(doc, "แผนก:", data.department, x, y);
    y = drawRow(doc, "วันที่นัด:", data.appointmentDate, x, y);
    y = drawRow(doc, "เวลา:", `${data.appointmentTime} น.`, x, y);

    if (data.note) {
      y += 4;
      y = noteBox(doc, "📋 หมายเหตุ", data.note, x, y);
    }

    drawFooter(doc, "ออกโดยอัตโนมัติจากระบบ NudMedi");
  });
}