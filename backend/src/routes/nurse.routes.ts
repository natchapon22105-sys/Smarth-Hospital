import { Router } from "express";
import { requireNurse } from "../middleware/nurse.middleware";
import { getQueueByDate, updateBookingStatus } from "../controllers/nurse.controller";

const router = Router();

router.use(requireNurse);

router.get("/queue", getQueueByDate);
router.put("/queue/:id/status", updateBookingStatus);

export default router;