import { Router } from "express";
import { staffAuthController } from "../controllers/staffAuthController";
import { requireAuth, requireStaff } from "../middleware/auth";

const router = Router();

router.get("/", staffAuthController.status);
router.post("/session", staffAuthController.session);

router.get("/me", requireAuth, requireStaff, staffAuthController.me);
router.post("/complete-password-change", requireAuth, requireStaff, staffAuthController.completePasswordChange);
router.get("/staff", requireAuth, requireStaff, staffAuthController.listStaff);
router.get(
  "/firebase-account",
  requireAuth,
  requireStaff,
  staffAuthController.lookupFirebaseAccount
);
router.get("/staff/:id", requireAuth, requireStaff, staffAuthController.getStaff);
router.post("/staff", requireAuth, requireStaff, staffAuthController.createStaff);
router.patch("/staff/:id", requireAuth, requireStaff, staffAuthController.updateStaff);
router.delete("/staff/:id", requireAuth, requireStaff, staffAuthController.deleteStaff);

export default router;
