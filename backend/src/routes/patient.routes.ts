import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  getProfile,
  updateProfile,
  updateProfileImage,
  updateMedicalHistory,
  upsertEmergencyContact,
  updateInsurance,
  acceptPdpaConsent,
  saveAll,
} from "../controllers/patient.controller";

const router = Router();

router.use(requireAuth);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/profile-image", updateProfileImage);
router.put("/medical-history", updateMedicalHistory);
router.put("/emergency-contact", upsertEmergencyContact);
router.put("/insurance", updateInsurance);
router.post("/pdpa-consent", acceptPdpaConsent);
router.put("/save-all", saveAll);

export default router;
