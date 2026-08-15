import { Request, Response } from "express";
import OpenAI from "openai";

const MODEL = process.env.OPENROUTER_MODEL || "gpt-4o-mini";

function getClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: { "HTTP-Referer": "https://nudmedi.app", "X-Title": "NudMedi" },
  });
}

const OCR_PROMPT = `คุณคือระบบ OCR สำหรับบัตรประชาชนไทยที่มีความแม่นยำสูง
ดูรูปบัตรประชาชนที่แนบมาอย่างละเอียด แล้ว Extract ข้อมูลต่อไปนี้เป็น JSON เท่านั้น (ห้ามมีข้อความอื่นนอก JSON):
{
  "nationalId": "เลขบัตรประชาชน 13 หลัก (เฉพาะตัวเลขเท่านั้น ห้ามมีขีดหรือเว้นวรรค)",
  "prefixTh": "คำนำหน้าชื่อภาษาไทย (เช่น นาย นาง นางสาว)",
  "firstNameTh": "ชื่อภาษาไทย (ห้ามรวมคำนำหน้า)",
  "lastNameTh": "นามสกุลภาษาไทย",
  "prefixEn": "คำนำหน้าชื่อภาษาอังกฤษ (เช่น Mr. Mrs. Ms.)",
  "firstNameEn": "ชื่อภาษาอังกฤษ (ห้ามรวมคำนำหน้า)",
  "lastNameEn": "นามสกุลภาษาอังกฤษ",
  "dateOfBirth": "วันเกิด (YYYY-MM-DD)",
  "religion": "ศาสนา"
}

⚠️ คำแนะนำสำคัญ:
- อ่านตัวเลขทุกตัวให้ถูกต้องแม่นยำที่สุด โดยเฉพาะเลขบัตรประชาชน 13 หลัก
- ชื่อและนามสกุลต้องแยกจากกัน ห้ามรวมกัน
- ถ้าอ่านข้อมูลใดไม่ชัดเจนหรือไม่แน่ใจ ให้ใส่ค่าว่าง (empty string) แทน
- อย่าเดาหรือเติมข้อมูลที่ไม่เห็นในรูป
- ไม่ต้องอ่านที่อยู่`;

/**
 * POST /api/ocr/id-card
 * multipart/form-data, field name "image"
 *
 * Uses OpenRouter (GPT-4o-mini) Vision to extract ID card fields.
 */
export async function extractIdCard(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: "no_image", message: "แนบรูปบัตรประชาชนด้วย (field: image)" });
  }

  try {
    const base64 = req.file.buffer.toString("base64");
    const mime = req.file.mimetype || "image/jpeg";
    const dataUrl = `data:${mime};base64,${base64}`;

    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: OCR_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "กรุณาอ่านข้อมูลจากบัตรประชาชนนี้" },
            { type: "image_url", image_url: { url: dataUrl } },
          ] as any[],
        },
      ],
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content || "{}";
    const fields = JSON.parse(text);

    return res.json({ ok: true, fields });
  } catch (err: any) {
    console.error("OCR error:", err);
    return res.json({
      ok: true,
      fields: {
        nationalId: "",
        prefixTh: "",
        firstNameTh: "",
        lastNameTh: "",
        prefixEn: "",
        firstNameEn: "",
        lastNameEn: "",
        address: "",
        dateOfBirth: "",
        religion: "",
      },
    });
  }
}
