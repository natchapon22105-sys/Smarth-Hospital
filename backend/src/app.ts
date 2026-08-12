import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes";
import patientRoutes from "./routes/patient.routes";
import bookingRoutes from "./routes/booking.routes";
import ocrRoutes from "./routes/ocr.routes";
import adminRoutes from "./routes/admin.routes";
import nurseRoutes from "./routes/nurse.routes";
import nurseAuthRoutes from "./routes/nurse-auth.routes";
import labRoutes from "./routes/lab.routes";
import familyRoutes from "./routes/family.routes";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

export const app = express();

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/ocr", ocrRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/nurse", nurseRoutes);
app.use("/api/nurse-auth", nurseAuthRoutes);
app.use("/api/lab", labRoutes);
app.use("/api/family", familyRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path });
});

// centralized error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: "server_error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong.",
  });
});
