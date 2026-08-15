import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.middleware";
import {
  analyzeSymptoms,
  analyzeFollowUp,
  confirmBooking,
  getAvailableSlots,
  getBookingHistory,
  getUpcomingAppointments,
  markAppointmentRead,
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
router.get("/appointments", getUpcomingAppointments);
router.post("/appointments/:id/read", markAppointmentRead);

export default router;
