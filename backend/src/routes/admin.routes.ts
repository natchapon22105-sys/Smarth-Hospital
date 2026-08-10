import { Router } from "express";
import { requireAdmin } from "../middleware/admin.middleware";
import { getDashboard, getSettings, updateSettings, getUsageStats } from "../controllers/admin.controller";
import { getPendingNurses, getAllNurses, approveNurse, rejectNurse, deleteNurse, getNurseActivity } from "../controllers/nurse-auth.controller";

const router = Router();

router.use(requireAdmin);

router.get("/dashboard", getDashboard);
router.get("/settings", getSettings);
router.put("/settings", updateSettings);
router.get("/usage", getUsageStats);

// Nurse management
router.get("/nurses/pending", getPendingNurses);
router.get("/nurses/all", getAllNurses);
router.post("/nurses/approve/:id", approveNurse);
router.post("/nurses/reject/:id", rejectNurse);
router.delete("/nurses/delete/:id", deleteNurse);
router.get("/nurses/activity/:id", getNurseActivity);

export default router;