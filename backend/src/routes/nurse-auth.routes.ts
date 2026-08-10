import { Router } from "express";
import { registerNurse, loginNurse } from "../controllers/nurse-auth.controller";

const router = Router();

// Public routes — nurse can register/login without session
router.post("/register", registerNurse);
router.post("/login", loginNurse);

export default router;