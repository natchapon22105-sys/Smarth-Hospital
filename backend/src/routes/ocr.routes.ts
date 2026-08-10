import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.middleware";
import { extractIdCard } from "../controllers/ocr.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

const router = Router();

router.post("/id-card", requireAuth, upload.single("image"), extractIdCard);

export default router;
