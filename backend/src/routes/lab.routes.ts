import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireNurse } from "../middleware/nurse.middleware";
import {
  getLabResults,
  getLabResultById,
  markLabResultRead,
  searchPatients,
  createLabResult,
} from "../controllers/lab.controller";

const router = Router();

// Patient-facing read endpoints (own results only)
router.use(requireAuth);
router.get("/results", getLabResults);
router.get("/results/:id", getLabResultById);
router.post("/results/:id/read", markLabResultRead);

// Staff endpoints (admin + nurse) — search patients & create/send results
router.get("/patients/search", requireNurse, searchPatients);
router.post("/results", requireNurse, createLabResult);

export default router;
