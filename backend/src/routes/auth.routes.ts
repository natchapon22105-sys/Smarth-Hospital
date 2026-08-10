import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  requestRegisterOtp,
  verifyRegisterOtp,
  register,
  login,
  logout,
  me,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller";

const router = Router();

router.post("/register/request-otp", requestRegisterOtp);
router.post("/register/verify-otp", verifyRegisterOtp);
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", requireAuth, me);

export default router;
