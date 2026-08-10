import OpenAI from "openai";

const MODEL = process.env.OPENROUTER_MODEL || "gpt-4o-mini";

let _openai: OpenAI | null = null;

function getClient(): OpenAI {
  if (_openai) return _openai;
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in .env");
  }
  _openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": "https://nudmedi.app",
      "X-Title": "NudMedi",
    },
  });
  return _openai;
}

const SYSTEM_PROMPT = `คุณคือแพทย์ผู้เชี่ยวชาญของโรงพยาบาล พูดภาษาไทย เป็นกันเอง ใช้ภาษาเข้าใจง่าย

## ขั้นตอนที่ 1 — ซักประวัติ (ตั้งคำถาม 5 ข้อ)
เมื่อได้รับอาการ รูปภาพ (ถ้ามี) และข้อมูลสุขภาพที่มีอยู่แล้วของผู้ป่วย ให้ตั้งคำถาม 5 ข้อ ที่จำเป็นเพื่อให้ได้ข้อมูลเพียงพอสำหรับการวินิจฉัยเบื้องต้น
⚠️ ห้ามถามซ้ำเกี่ยวกับข้อมูลสุขภาพที่ระบบแจ้งให้ทราบแล้ว 
ตอบในรูปแบบ JSON เท่านั้น (ห้ามมีข้อความอื่นนอก JSON):
{
  "questions": [
    "คำถามที่ 1 ที่เกี่ยวข้องกับอาการหลัก...",
    "คำถามที่ 2 ที่เกี่ยวข้องกับระยะเวลา...",
    "คำถามที่ 3 ที่เกี่ยวข้องกับอาการร่วม...",
    "คำถามที่ 4 (ห้ามถามซ้ำโรคประจำตัว/ประวัติแพ้ยา ถ้าระบบมีข้อมูลแล้ว)",
    "คำถามที่ 5 ที่เกี่ยวข้องกับพฤติกรรมเสี่ยง..."
  ]
}
โดยทั้ง 5 ข้อต้องครอบคลุมหัวข้อเหล่านี้:
1. อาการหลักเป็นอย่างไร (ลักษณะ ตำแหน่ง ความรุนแรง)
2. เริ่มมีอาการเมื่อไหร่ เป็นนานแค่ไหน
3. มีอาการอื่นร่วมด้วยหรือไม่ (เช่น คลื่นไส้ เวียนหัว มีไข้)
4. ประวัติโรคประจำตัว หรือยาที่ทานเป็นประจำ หรือประวัติการแพ้ยา (ถามเฉพาะเมื่อระบบยังไม่มีข้อมูล)
5. พฤติกรรมเสี่ยง หรือสาเหตุที่คิดว่าทำให้เกิดอาการ หรือเคยไปพบแพทย์มาก่อนหรือไม่

## ขั้นตอนที่ 2 — วิเคราะห์และแนะนำ (ละเอียดเหมือนหมอจริง)
เมื่อได้ข้อมูลครบแล้ว ให้วิเคราะห์และตอบในรูปแบบ JSON เท่านั้น (ห้ามมีข้อความอื่นนอก JSON):
{
  "summary": "สรุปอาการโดยละเอียด วิเคราะห์สาเหตุที่เป็นไปได้ พร้อมเหตุผลทางการแพทย์",
  "differential_diagnosis": ["การวินิจฉัยแยกโรคที่เป็นไปได้ 2-3 ข้อ"],
  "recommended_department": "แผนกที่ควรไปรับการรักษา",
  "urgency": "emergency | urgent | routine | non_urgent",
  "urgency_label": "ฉุกเฉิน | เร่งด่วน | ทั่วไป | ไม่เร่งด่วน",
  "reason": "เหตุผลทางการแพทย์ที่แนะนำแผนกนี้ พร้อมข้อควรสังเกต",
  "self_care": "คำแนะนำการดูแลตัวเองเบื้องต้นก่อนไปพบแพทย์ (ละเอียด ปฏิบัติได้จริง)",
  "red_flags": "อาการอันตรายที่ควรไปโรงพยาบาลทันที ถ้ามี",
  "advice": "คำแนะนำเพิ่มเติมสำหรับการเตรียมตัวไปพบแพทย์"
}`;

/**
 * Step 1: Send symptoms + optional image, get 5 questions from AI.
 * Returns { questions: string[] }
 */
export async function askFollowUpQuestions(
  symptoms: string,
  medicalSummary: string,
  imageBase64?: string
): Promise<{ questions: string[] }> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  const instruction = medicalSummary && !medicalSummary.includes("ไม่มีข้อมูล")
    ? `ผู้ป่วยมีอาการ: ${symptoms}\n\n${medicalSummary}\n\nกรุณาตั้งคำถาม 5 ข้อ โดยห้ามถามซ้ำเกี่ยวกับโรคประจำตัวหรือประวัติการแพ้ยาที่แจ้งแล้ว เน้นถามเรื่องอื่นที่จำเป็น ตอบเป็น JSON ที่มี questions array`
    : `ผู้ป่วยมีอาการ: ${symptoms}\n\nกรุณาตั้งคำถาม 5 ข้อที่จำเป็นเพื่อให้วิเคราะห์อาการได้ถูกต้อง ตอบเป็น JSON ที่มี questions array`;

  const userContent: any[] = [{ type: "text" as const, text: instruction }];

  if (imageBase64) {
    userContent.push({
      type: "image_url" as const,
      image_url: { url: imageBase64 },
    });
  }

  messages.push({ role: "user", content: userContent });

  const res = await getClient().chat.completions.create({
    model: MODEL,
    messages,
    max_tokens: 800,
    response_format: { type: "json_object" },
  });

  const text = res.choices[0]?.message?.content || '{"questions":[]}';

  try {
    return JSON.parse(text);
  } catch {
    return {
      questions: [
        "อาการหลักของคุณเป็นอย่างไร? ปวดแบบไหน ตำแหน่งไหน?",
        "เริ่มมีอาการเมื่อไหร่? เป็นต่อเนื่องหรือเป็นๆ หายๆ?",
        "มีอาการอื่นร่วมด้วยหรือไม่ เช่น ไข้ คลื่นไส้ เวียนหัว?",
        "คุณมีโรคประจำตัวหรือแพ้ยาอะไรหรือไม่?",
        "คุณเคยไปพบแพทย์หรือรับการรักษามาก่อนหรือไม่?",
      ],
    };
  }
}

/**
 * Step 2: Send symptoms + answers to all 5 questions, get final analysis.
 */
export async function getFinalAnalysis(
  symptoms: string,
  answers: string[],
  medicalSummary: string,
  imageBase64?: string
): Promise<{
  summary: string;
  differential_diagnosis: string[];
  recommended_department: string;
  urgency: string;
  urgency_label: string;
  reason: string;
  self_care: string;
  red_flags: string;
  advice: string;
}> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT + "\n\nตอนนี้คุณมีข้อมูลครบถ้วนแล้ว กรุณาวิเคราะห์อย่างละเอียดเหมือนแพทย์จริง และตอบเป็น JSON เท่านั้น" },
  ];

  const extraInfo = medicalSummary && !medicalSummary.includes("ไม่มีข้อมูล")
    ? `\n\nข้อมูลสุขภาพที่มีอยู่แล้ว: ${medicalSummary}`
    : "";

  const userContent: any[] = [{
    type: "text" as const,
    text: `อาการเริ่มต้น: ${symptoms}${extraInfo}\n\nคำตอบจากการซักประวัติ:\n${answers.map((a, i) => `คำถามที่ ${i + 1}: ${a}`).join("\n")}\n\nจากข้อมูลทั้งหมด กรุณาวิเคราะห์อย่างละเอียดและตอบเป็น JSON ตามรูปแบบที่กำหนด`,
  }];

  if (imageBase64) {
    userContent.push({
      type: "image_url" as const,
      image_url: { url: imageBase64 },
    });
  }

  messages.push({ role: "user", content: userContent });

  const res = await getClient().chat.completions.create({
    model: MODEL,
    messages,
    max_tokens: 1200,
    response_format: { type: "json_object" },
  });

  const text = res.choices[0]?.message?.content || "{}";

  try {
    return JSON.parse(text);
  } catch {
    return {
      summary: "ไม่สามารถวิเคราะห์ได้ กรุณาพบแพทย์เพื่อรับการวินิจฉัย",
      differential_diagnosis: ["อาการไม่ชัดเจน ควรพบแพทย์เพื่อตรวจเพิ่มเติม"],
      recommended_department: "อายุรกรรม",
      urgency: "routine",
      urgency_label: "ทั่วไป",
      reason: "ควรพบแพทย์อายุรกรรมเพื่อตรวจวินิจฉัยเพิ่มเติม",
      self_care: "พักผ่อนให้เพียงพอ ดื่มน้ำมากๆ หลีกเลี่ยงอาหารรสจัด สังเกตอาการ หากอาการแย่ลงให้รีบพบแพทย์",
      red_flags: "หากมีไข้สูงเกิน 39°C, หายใจลำบาก, ซึมลง, หรือชัก ให้ไปโรงพยาบาลทันที",
      advice: "เตรียมประวัติการรักษาและยาที่ทานประจำไปพบแพทย์ด้วย",
    };
  }
}