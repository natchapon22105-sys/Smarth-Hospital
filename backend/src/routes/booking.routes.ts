import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.middleware";
import {
  analyzeSymptoms,
  analyzeFollowUp,
  confirmBooking,
  getAvailableSlots,
  getBookingHistory,
} from "../controllers/booking.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

const router = Router();

router.use(requireAuth);

router.post("/analyze", upload.single("image"), analyzeSymptoms);
router.post("/analyze-followup", analyzeFollowUp);
router.post("/confirm", confirmBooking);
router.get("/available-slots", getAvailableSlots);
router.get("/history", getBookingHistory);

export default router;
