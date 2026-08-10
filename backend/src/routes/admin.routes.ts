import { Router } from "express";
import { requireAdmin } from "../middleware/admin.middleware";
import { getDashboard, getSettings, updateSettings, getUsageStats } from "../controllers/admin.controller";

const router = Router();

router.use(requireAdmin);

router.get("/dashboard", getDashboard);
router.get("/settings", getSettings);
router.put("/settings", updateSettings);
router.get("/usage", getUsageStats);

export default router;