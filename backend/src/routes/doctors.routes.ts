import { Router } from "express";
import { doctorController } from "../controllers";
import { requireAuth, requireRoles } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRoles("doctor"));
router.get("/", doctorController.status);

export default router;
