import { Router } from "express";
import { adminController } from "../controllers";
import { requireAuth, requireRoles } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRoles("admin"));
router.get("/", adminController.status);

export default router;
