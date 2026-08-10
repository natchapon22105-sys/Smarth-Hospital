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

const OCR_PROMPT = `คุณคือระบบ OCR สำหรับบัตรประชาชนไทย
ดูรูปบัตรประชาชนที่แนบมา แล้ว Extract ข้อมูลต่อไปนี้เป็น JSON เท่านั้น (ห้ามมีข้อความอื่น):
{
  "nationalId": "เลขบัตรประชาชน 13 หลัก (เฉพาะตัวเลข)",
  "prefixTh": "คำนำหน้าชื่อภาษาไทย (เช่น นาย นาง นางสาว)",
  "firstNameTh": "ชื่อภาษาไทย",
  "lastNameTh": "นามสกุลภาษาไทย",
  "prefixEn": "คำนำหน้าชื่อภาษาอังกฤษ (เช่น Mr. Mrs. Ms.)",
  "firstNameEn": "ชื่อภาษาอังกฤษ",
  "lastNameEn": "นามสกุลภาษาอังกฤษ",
  "address": "ที่อยู่ปัจจุบัน (เต็ม)",
  "dateOfBirth": "วันเกิด (YYYY-MM-DD)",
  "religion": "ศาสนา"
}`;

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
