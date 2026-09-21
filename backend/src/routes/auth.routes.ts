import { Router } from "express";
import { staffAuthController } from "../controllers/staffAuthController";
import { requireAuth, requireStaff } from "../middleware/auth";

const router = Router();

router.get("/", staffAuthController.status);
router.post("/session", staffAuthController.session);

router.get("/staff", requireAuth, requireStaff, staffAuthController.listStaff);
router.post("/staff", requireAuth, requireStaff, staffAuthController.createStaff);
router.patch("/staff/:id", requireAuth, requireStaff, staffAuthController.updateStaff);

export default router;
