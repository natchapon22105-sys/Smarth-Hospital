"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import HamburgerMenu from "@/components/HamburgerMenu";
import Modal from "@/components/Modal";
import { api, ApiError } from "@/lib/api";

type Booking = {
  id: string;
  symptoms: string | null;
  urgency: string | null;
  recommended_department: string | null;
  ai_recommendation: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  status: string;
  created_at: string;
};

type Analysis = {
  summary: string;
  differential_diagnosis?: string[];
  recommended_department: string;
  urgency: string;
  urgency_label: string;
  reason: string;
  self_care?: string;
  red_flags?: string;
  advice: string;
};

type Step = "input" | "questions" | "result" | "schedule" | "done";

const URGENCY_COLORS: Record<string, string> = {
  emergency: "bg-red-100 text-red-700 border-red-200",
  urgent: "bg-amber-100 text-amber-700 border-amber-200",
  routine: "bg-teal-light text-teal-dark border-teal/20",
  non_urgent: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function BookingPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>("input");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSelectModal, setShowSelectModal] = useState(true); // เด้งเลือกบัญชีตอนเข้าหน้า

  // Step 1: input
  const [symptoms, setSymptoms] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Step 2: questions
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isQListening, setIsQListening] = useState(false);

  // Step 3: result
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  // Step 3.5: schedule
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [availableSlots, setAvailableSlots] = useState<{ time: string; count: number; full: boolean; passed?: boolean }[]>([]);
  const [maxQueuePerHour, setMaxQueuePerHour] = useState(16);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string; description: string }[]>([]);

  // Step 4: done
  const [confirmed, setConfirmed] = useState<Booking | null>(null);

  // Family / sub-accounts — book on behalf of a family member
  type FamilyMember = {
    memberId: string;
    patientId: string;
    relationship: string;
    nickname: string | null;
    prefix_th: string | null;
    first_name_th: string | null;
    last_name_th: string | null;
    national_id: string | null;
  };
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("self"); // "self" or patientId

  useEffect(() => {
    // load family members for "book for someone else"
    (async () => {
      try {
        const res = await api.get<{ members: FamilyMember[] }>("/api/family/members");
        setFamilyMembers(res.members || []);
      } catch {
        // non-fatal
      }
    })();
    // load departments
    (async () => {
      try {
        const res = await api.get<{ departments: { id: string; name: string; description: string }[] }>("/api/admin/departments/active");
        setDepartments(res.departments || []);
      } catch {
        // non-fatal
      }
    })();
  }, []);

  // ---- Speech-to-Text (continuous + auto-stop after silence) ----
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  function startListening(setter: (v: string) => void, listeningSetter: (v: boolean) => void) {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setError("เบราว์เซอร์นี้ไม่รองรับ Speech-to-Text");
      return;
    }
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "th-TH";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => listeningSetter(true);
    recognition.onerror = () => listeningSetter(false);

    recognition.onresult = (e: any) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      let finalTranscript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setter(finalTranscript);
      }
      silenceTimerRef.current = setTimeout(() => {
        recognition.stop();
        listeningSetter(false);
      }, 1500);
    };

    recognition.onend = () => {
      listeningSetter(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopListening(listeningSetter: (v: boolean) => void) {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    listeningSetter(false);
  }

  // ---- Image upload + compress ----
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Compress image on client side before upload — speeds up AI drastically
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Compress to max 800px width, JPEG quality 0.6
      const img = new window.Image();
      img.onload = () => {
        const maxW = 800;
        const maxH = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
        if (h > maxH) { w = Math.round(w * (maxH / h)); h = maxH; }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", 0.6);
        setImageBase64(compressed);
        setImagePreview(dataUrl); // show original for preview
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  // ---- Step 1 → Step 2: send symptoms to AI, get 5 questions ----
  async function handleAnalyze() {
    if (!symptoms.trim()) {
      setError("กรุณากรอกอาการก่อน");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("symptoms", symptoms);
      if (imageBase64) {
        const res = await fetch(imageBase64);
        const blob = await res.blob();
        formData.append("image", blob, "symptom.jpg");
      }
      const res = await api.upload<{ questions: string[] }>("/api/booking/analyze", formData);
      setQuestions(res.questions);
      setAnswers(new Array(res.questions.length).fill(""));
      setCurrentQuestion(0);
      setStep("questions");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ส่งอาการไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  // ---- Step 2: answer a question ----
  function handleAnswerChange(value: string) {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = value;
    setAnswers(newAnswers);
  }

  function handleNextQuestion() {
    if (!answers[currentQuestion]?.trim()) {
      setError("กรุณาตอบคำถามก่อน");
      return;
    }
    setError(null);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  }

  function handlePrevQuestion() {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  }

  // ---- Step 2 → Step 3: send all answers to AI for final analysis ----
  async function handleSubmitAllAnswers() {
    // Check all answered
    for (let i = 0; i < answers.length; i++) {
      if (!answers[i]?.trim()) {
        setCurrentQuestion(i);
        setError(`กรุณาตอบคำถามข้อที่ ${i + 1}`);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ analysis: Analysis }>("/api/booking/analyze-followup", {
        symptoms,
        answers,
        imageBase64: imageBase64 || undefined,
      });
      setAnalysis(res.analysis);
      setStep("result");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "วิเคราะห์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  // ---- Step 3 → Step 3.5: pick date/time ----
  async function handleGoToSchedule() {
    if (!analysis) return;
    setStep("schedule");
    setSelectedDepartment("");
    // Set default date to today
    const today = new Date(new Date().getTime() + 7 * 60 * 60 * 1000).toISOString().split("T")[0];
    setAppointmentDate(today);
    setAppointmentTime("");
    await fetchSlots(today);
  }

  // ---- Fetch available slots ----
  async function fetchSlots(date: string) {
    setSlotsLoading(true);
    try {
      const res = await api.get<{ maxQueuePerHour: number; slots: { time: string; count: number; full: boolean; passed?: boolean }[] }>(
        `/api/booking/available-slots?date=${date}`
      );
      setAvailableSlots(res.slots);
      setMaxQueuePerHour(res.maxQueuePerHour);
    } catch {
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }

  async function handleDateChange(date: string) {
    setAppointmentDate(date);
    setAppointmentTime("");
    await fetchSlots(date);
  }

  // ---- Step 3.5 → Step 4: confirm booking ----
  async function handleConfirm() {
    if (!analysis || !appointmentDate || !appointmentTime) {
      setError("กรุณาเลือกวันและเวลา");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ booking: Booking }>("/api/booking/confirm", {
        symptoms,
        analysis: { ...analysis, recommended_department: selectedDepartment || analysis.recommended_department },
        imageBase64: imageBase64 || undefined,
        appointmentDate,
        appointmentTime,
        patientId: selectedPatientId === "self" ? undefined : selectedPatientId,
      });
      setConfirmed(res.booking);
      setStep("done");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("เวลานี้ถูกจองแล้ว กรุณาเลือกเวลาอื่น");
        await fetchSlots(appointmentDate);
      } else {
        setError(err instanceof ApiError ? err.message : "จองคิวไม่สำเร็จ");
      }
    } finally {
      setLoading(false);
    }
  }

  // ---- Reset ----
  function resetForm() {
    setStep("input");
    setSymptoms("");
    setImageBase64(null);
    setImagePreview(null);
    setQuestions([]);
    setAnswers([]);
    setCurrentQuestion(0);
    setAnalysis(null);
    setConfirmed(null);
    setError(null);
  }

  return (
    <main className="relative min-h-screen pb-24">
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat opacity-[0.15]"
        style={{ backgroundImage: 'url("/bg-booking.png")' }}
      />

      {/* Animated floating decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ transformStyle: "preserve-3d" }}>
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-teal/10 animate-[float-1_8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-teal/10 animate-[float-2_10s_ease-in-out_infinite]" />
        <div className="absolute left-1/4 top-1/3 h-20 w-20 rounded-full bg-teal/10 animate-[float-3_7s_ease-in-out_infinite]" />
        <div className="absolute bottom-1/4 right-1/4 h-16 w-16 rounded-full bg-teal/10 animate-[float-1_9s_ease-in-out_infinite_2s]" />
        <div className="absolute left-[15%] top-[15%] text-4xl text-teal/20 animate-[spin-plus_12s_linear_infinite]" style={{ transformStyle: "preserve-3d" }}>+</div>
        <div className="absolute right-[20%] bottom-[20%] text-3xl text-teal/20 animate-[spin-plus_15s_linear_infinite_2s]" style={{ transformStyle: "preserve-3d" }}>+</div>
      </div>

      <header className="fixed inset-x-0 top-0 z-50 flex items-center gap-3 border-b border-line bg-surface/90 px-5 py-4 backdrop-blur-md">
        <HamburgerMenu />
        <Link href="/app-home" className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink transition hover:bg-teal-light hover:text-teal-dark" aria-label="กลับหน้าเลือกบริการ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12l9-9 9 9" />
            <path d="M5 10v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1v-9" />
          </svg>
        </Link>
        <span className="font-display text-base font-semibold">จองคิว</span>
      </header>

      <div className="relative z-10 mx-auto max-w-lg space-y-5 px-5 pt-20">
        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}{" "}
            {error.includes("PDPA") && (
              <Link href="/patient/profile" className="underline">
                ไปหน้าข้อมูลส่วนตัว
              </Link>
            )}
          </p>
        )}

        {/* ---- STEP 1: Input symptoms ---- */}
        {step === "input" && (
          <div className="card p-6">
            <h1 className="mb-1 font-display text-lg font-semibold text-ink">กรอกอาการ</h1>
            <p className="mb-4 text-sm text-ink/55">บอกอาการที่คุณเป็น เพื่อให้ AI วิเคราะห์และแนะนำแผนก</p>

            <label className="field-label">อาการที่พบ</label>
            <div className="relative">
              <textarea
                className="field-input min-h-[120px] pr-10"
                placeholder="เช่น ปวดหัว มีไข้ ไอ เจ็บคอ..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  if (isListening) stopListening(setIsListening);
                  else startListening(
                    (v: string) => setSymptoms(prev => prev ? prev + " " + v : v),
                    setIsListening
                  );
                }}
                className={`absolute right-2 top-2 rounded-lg p-2 text-sm transition ${
                  isListening ? "bg-red-100 text-red-600 animate-pulse" : "text-ink/40 hover:text-teal"
                }`}
                title={isListening ? "หยุดฟัง" : "พูดบอกอาการ"}
              >
                {isListening ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                )}
              </button>
            </div>
            {isListening && (
              <p className="mt-1 text-xs text-red-500 animate-pulse"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg> กำลังฟัง... พูดได้เลย (ระบบหยุดอัตโนมัติเมื่อเงียบ)</p>
            )}

            {/* Image upload */}
            <div className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageUpload}
              />
              <button
                type="button"
                className="btn-secondary w-full text-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1.5"><polygon points="23 19 20 8 18 8 15 1 9 1 6 8 4 8 1 19 23 19" /><line x1="12" y1="16" x2="12" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
                    เปลี่ยนรูปภาพ
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                    แนบรูปภาพอาการ (ถ้ามี)
                  </>
                )}
              </button>
              {imagePreview && (
                <div className="mt-2 overflow-hidden rounded-xl border border-line">
                  <img src={imagePreview} alt="รูปอาการ" className="w-full object-contain max-h-48" />
                  <button
                    type="button"
                    className="w-full py-1.5 text-xs text-danger hover:bg-danger/5"
                    onClick={() => { setImageBase64(null); setImagePreview(null); }}
                  >
                    ลบรูป
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn-primary mt-5 w-full"
              onClick={handleAnalyze}
              disabled={loading || !symptoms.trim()}
            >
              {loading ? "กำลังวิเคราะห์..." : "ให้ AI วิเคราะห์อาการ"}
            </button>
          </div>
        )}

        {/* ---- STEP 2: Answer Questions ---- */}
        {step === "questions" && questions.length > 0 && (
          <div className="card p-6">
            <h1 className="mb-1 font-display text-lg font-semibold text-ink">ซักประวัติเบื้องต้นโดย AI</h1>
            <p className="mb-4 text-sm text-ink/55">ตอบคำถามทั้งหมดให้ครบ แล้ว AI จะวิเคราะห์อาการให้</p>

            {/* Progress */}
            <div className="mb-4 flex gap-1.5">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition ${
                    i < currentQuestion ? "bg-teal" : i === currentQuestion ? "bg-teal-dark" : "bg-line"
                  }`}
                />
              ))}
            </div>

            {/* Current question */}
            <div className="rounded-xl border border-teal/20 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">
                  {currentQuestion + 1}
                </span>
                <span className="text-sm font-medium text-teal">คำถามที่ {currentQuestion + 1} จาก {questions.length}</span>
              </div>
              <p className="text-sm text-ink leading-relaxed font-medium">{questions[currentQuestion]}</p>

              <div className="mt-4">
                <label className="field-label">คำตอบของคุณ</label>
                <div className="relative">
                  <textarea
                    className="field-input min-h-[80px] pr-10"
                    placeholder="พิมพ์หรือพูดคำตอบ..."
                    value={answers[currentQuestion] || ""}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (isQListening) stopListening(setIsQListening);
                      else startListening(
                        (v: string) => handleAnswerChange(answers[currentQuestion] ? answers[currentQuestion] + " " + v : v),
                        setIsQListening
                      );
                    }}
                    className={`absolute right-2 top-2 rounded-lg p-2 text-sm transition ${
                      isQListening ? "bg-red-100 text-red-600 animate-pulse" : "text-ink/40 hover:text-teal"
                    }`}
                    title={isQListening ? "หยุดฟัง" : "พูดตอบ"}
                  >
                    {isQListening ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

            {/* Navigation */}
            <div className="mt-5 flex gap-3">
              {currentQuestion > 0 ? (
                <button type="button" className="btn-secondary flex-1" onClick={handlePrevQuestion}>
                  ย้อนกลับ
                </button>
              ) : (
                <button type="button" className="btn-secondary flex-1" onClick={() => setStep("input")}>
                  แก้ไขอาการ
                </button>
              )}

              {currentQuestion < questions.length - 1 ? (
                <button type="button" className="btn-primary flex-1" onClick={handleNextQuestion}>
                  ถัดไป
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary flex-1"
                  onClick={handleSubmitAllAnswers}
                  disabled={loading}
                >
                  {loading ? "กำลังวิเคราะห์..." : "ส่งวิเคราะห์ทั้งหมด"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ---- STEP 3: Analysis result ---- */}
        {step === "result" && analysis && (
          <div className="card p-6">
            <h1 className="mb-1 font-display text-lg font-semibold text-ink">ผลการวิเคราะห์</h1>

            {/* Urgency badge */}
            <div className="mt-4">
              <span
                className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${
                  URGENCY_COLORS[analysis.urgency] || "bg-gray-100 text-gray-600"
                }`}
              >
                {analysis.urgency_label}
              </span>
            </div>

            {/* Summary */}
            <div className="mt-4">
              <label className="field-label">สรุปอาการ</label>
              <p className="text-sm text-ink/80 leading-relaxed">{analysis.summary}</p>
            </div>

            {/* Differential diagnosis */}
            {analysis.differential_diagnosis && analysis.differential_diagnosis.length > 0 && (
              <div className="mt-4">
                <label className="field-label">การวินิจฉัยแยกโรค</label>
                <ul className="list-disc space-y-1 pl-5 text-sm text-ink/80">
                  {analysis.differential_diagnosis.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Department */}
            <div className="mt-4 rounded-xl bg-teal-light p-4">
              <label className="field-label text-teal-dark">แผนกที่แนะนำ</label>
              <p className="text-lg font-semibold text-teal-dark">{analysis.recommended_department}</p>
              <p className="mt-1 text-sm text-teal-dark/70">{analysis.reason}</p>
            </div>

            {/* Self care */}
            {analysis.self_care && (
              <div className="mt-4">
                <label className="field-label">คำแนะนำดูแลตัวเองเบื้องต้น</label>
                <p className="text-sm text-ink/80 leading-relaxed">{analysis.self_care}</p>
              </div>
            )}

            {/* Red flags */}
            {analysis.red_flags && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                <label className="field-label text-red-700"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1 -mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> อาการอันตรายที่ควรไปโรงพยาบาลทันที</label>
                <p className="text-sm text-red-700 leading-relaxed">{analysis.red_flags}</p>
              </div>
            )}

            {/* Advice */}
            <div className="mt-4">
              <label className="field-label">คำแนะนำเพิ่มเติม</label>
              <p className="text-sm text-ink/80 leading-relaxed">{analysis.advice}</p>
            </div>

            {/* คำเตือน */}
            <div className="mt-4 rounded-xl border-2 border-danger bg-red-50 p-4 text-sm">
              <div className="flex items-start gap-2.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-danger">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <p className="font-bold text-danger">คำเตือน</p>
                  <p className="mt-1 leading-relaxed text-red-700">
                    ผลการวิเคราะห์นี้เป็นเพียงการวิเคราะห์เบื้องต้นเท่านั้น <strong className="text-danger">ไม่ใช่การวินิจฉัยทางการแพทย์</strong>
                    <br />
                    กรุณาปรึกษาแพทย์ผู้เชี่ยวชาญเพื่อการวินิจฉัยที่ถูกต้อง
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={resetForm}
              >
                กรอกใหม่
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={handleGoToSchedule}
              >
                เลือกวันเวลา
              </button>
            </div>
          </div>
        )}

        {/* ---- STEP 3.5: Schedule picker ---- */}
        {step === "schedule" && analysis && (
          <div className="card p-6">
            <h1 className="mb-1 font-display text-lg font-semibold text-ink">เลือกวันและเวลา</h1>

            {/* Department selector with AI recommendation */}
            <div className="mt-4 rounded-xl border border-teal/25 bg-teal-light p-4">
              <label className="field-label text-teal-dark">เลือกแผนก</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {departments.map((dept) => {
                  const isRecommended = dept.name === analysis.recommended_department;
                  const isSelected = selectedDepartment === dept.name;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => setSelectedDepartment(isSelected ? "" : dept.name)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        isSelected
                          ? "border-teal bg-teal text-white"
                          : isRecommended
                          ? "border-teal bg-teal/15 text-teal-dark ring-2 ring-teal/40"
                          : "border-line bg-surface text-ink hover:bg-teal-light"
                      }`}
                    >
                      {dept.name}
                      {isRecommended && <span className="ml-1 text-[9px] font-bold uppercase opacity-70">recommend</span>}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-teal-dark/70">
                AI แนะนำ: <span className="font-semibold">{analysis.recommended_department}</span> — {analysis.reason}
              </p>
            </div>

            {/* Date picker */}
            <label className="field-label mt-4">เลือกวันที่</label>
            <input
              type="date"
              className="field-input mb-4"
              value={appointmentDate}
              min={new Date(new Date().getTime() + 7 * 60 * 60 * 1000).toISOString().split("T")[0]}
              onChange={(e) => handleDateChange(e.target.value)}
            />

            {/* Time slots */}
            <label className="field-label">เลือกเวลา</label>
            {slotsLoading ? (
              <p className="text-sm text-ink/50">กำลังโหลดช่วงเวลา...</p>
            ) : availableSlots.length === 0 ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
                ไม่มีช่วงเวลาว่างในวันที่เลือก กรุณาเลือกวันอื่น
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map((slot) => {
                  const [h, m] = slot.time.split(":").map(Number);
                  const period = h < 12 ? "เช้า" : "บ่าย";
                  const isSelected = appointmentTime === slot.time;
                  const isFull = slot.full;
                  const isPassed = slot.passed;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={isFull}
                      onClick={() => setAppointmentTime(slot.time)}
                      className={`rounded-xl border px-3 py-2.5 text-sm transition ${
                        isFull
                          ? "cursor-not-allowed border-red-300 bg-red-100 text-red-600"
                          : isSelected
                          ? "border-teal bg-teal text-white"
                          : "border-line bg-surface text-ink hover:bg-teal-light"
                      }`}
                    >
                      <span className="block font-medium">{slot.time}</span>
                      <span className={`block text-[10px] ${isFull ? "text-red-500" : "opacity-60"}`}>
                        {isPassed ? "หมดเวลา" : isFull ? "เต็ม" : `${slot.count}/${maxQueuePerHour} คน`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {appointmentTime && (
              <p className="mt-3 text-center text-sm text-teal-dark">
                คุณเลือก: {appointmentDate} เวลา {appointmentTime} น.
                {(() => {
                  const sel = availableSlots.find((s) => s.time === appointmentTime);
                  return sel?.full ? " (คิวเต็มแล้ว)" : "";
                })()}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setStep("result")}
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={handleConfirm}
                disabled={loading || !appointmentDate || !appointmentTime}
              >
                {loading ? "กำลังจอง..." : "ยืนยันจองคิว"}
              </button>
            </div>
          </div>
        )}
        {step === "done" && confirmed && (
          <div className="card p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-light text-teal-dark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h1 className="font-display text-lg font-semibold text-ink">จองคิวสำเร็จ</h1>
            <p className="mt-1 text-sm text-ink/60">
              หมายเลขคิว: {confirmed.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="mt-1 text-sm text-ink/60">สถานะ: รอดำเนินการ</p>
            {confirmed.recommended_department && (
              <p className="mt-1 text-sm font-medium text-teal-dark">
                แผนก: {confirmed.recommended_department}
              </p>
            )}
            {confirmed.appointment_date && (
              <p className="mt-1 text-sm text-ink/60">
                วันที่นัด: {confirmed.appointment_date} เวลา {confirmed.appointment_time} น.
              </p>
            )}
            <button
              type="button"
              className="btn-secondary mt-5 w-full"
              onClick={resetForm}
            >
              จองคิวใหม่
            </button>
          </div>
        )}

        {/* ---- Select account modal (shows first) ---- */}
        <Modal open={showSelectModal} onClose={() => setShowSelectModal(false)} title="จองคิวให้ใคร?">
          <p className="mb-4 text-sm text-ink/55">เลือกบัญชีที่ต้องการจองคิว จากนั้นกรอกอาการได้เลย</p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => { setSelectedPatientId("self"); setShowSelectModal(false); }}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                selectedPatientId === "self"
                  ? "border-teal bg-teal-light"
                  : "border-line bg-surface hover:bg-teal-light"
              }`}
            >
              <span className="font-medium text-ink">ตัวเอง</span>
              {selectedPatientId === "self" && <span className="text-xs text-teal-dark">กำลังเลือก</span>}
            </button>
            {familyMembers.map((m) => {
              const name = m.nickname || `${m.prefix_th || ""}${m.first_name_th || ""} ${m.last_name_th || ""}`.trim() || "ไม่ระบุชื่อ";
              return (
                <button
                  key={m.memberId}
                  type="button"
                  onClick={() => { setSelectedPatientId(m.patientId); setShowSelectModal(false); }}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                    selectedPatientId === m.patientId
                      ? "border-teal bg-teal-light"
                      : "border-line bg-surface hover:bg-teal-light"
                  }`}
                >
                  <span className="font-medium text-ink">{name}</span>
                  {selectedPatientId === m.patientId && <span className="text-xs text-teal-dark">กำลังเลือก</span>}
                </button>
              );
            })}
          </div>
          {familyMembers.length === 0 && (
            <p className="mt-3 text-center text-xs text-ink/40">
              ยังไม่มีบัญชีรอง <Link href="/family" className="text-teal-dark underline" onClick={() => setShowSelectModal(false)}>เพิ่มที่นี่</Link>
            </p>
          )}
          <button
            type="button"
            className="btn-primary mt-4 w-full"
            onClick={() => setShowSelectModal(false)}
          >
            เริ่มจองคิว
          </button>
        </Modal>
      </div>

      {/* Floating SOS 1669 */}
      <a
        href="tel:1669"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 transition hover:scale-110 active:scale-95"
      >
        <Image src="/botton1669.png" alt="โทร 1669" width={56} height={56} className="h-full w-full" />
      </a>
    </main>
  );
}
