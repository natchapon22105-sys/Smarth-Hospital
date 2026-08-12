import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  getFamilyMembers,
  createFamilyMember,
  deleteFamilyMember,
} from "../controllers/family.controller";

const router = Router();

router.use(requireAuth);

router.get("/members", getFamilyMembers);
router.post("/members", createFamilyMember);
router.delete("/members/:id", deleteFamilyMember);

export default router;
