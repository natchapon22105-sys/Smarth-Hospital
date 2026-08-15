import { Router } from "express";
import { requireAdmin } from "../middleware/admin.middleware";
import { loginAdmin, getDashboard, getSettings, updateSettings, getUsageStats, getUsers, updateUser, deleteUser } from "../controllers/admin.controller";
import { getPendingNurses, getAllNurses, approveNurse, rejectNurse, deleteNurse, getNurseActivity } from "../controllers/nurse-auth.controller";
import { getAvailableSlots, staffCreateBooking } from "../controllers/booking.controller";
import { getDepartments, getActiveDepartments, createDepartment, updateDepartment, deleteDepartment } from "../controllers/department.controller";

const router = Router();

// Public admin login (no session required).
router.post("/login", loginAdmin);

// Public: active departments (for booking page)
router.get("/departments/active", getActiveDepartments);

router.use(requireAdmin);

router.get("/dashboard", getDashboard);
router.get("/settings", getSettings);
router.put("/settings", updateSettings);
router.get("/usage", getUsageStats);

// User management
router.get("/users", getUsers);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// Nurse management
router.get("/nurses/pending", getPendingNurses);
router.get("/nurses/all", getAllNurses);
router.post("/nurses/approve/:id", approveNurse);
router.post("/nurses/reject/:id", rejectNurse);
router.delete("/nurses/delete/:id", deleteNurse);
router.get("/nurses/activity/:id", getNurseActivity);

// Staff booking
router.get("/bookings/slots", getAvailableSlots);
router.post("/bookings/create", staffCreateBooking);

// Department management (admin only)
router.get("/departments", getDepartments);
router.post("/departments", createDepartment);
router.put("/departments/:id", updateDepartment);
router.delete("/departments/:id", deleteDepartment);

export default router;