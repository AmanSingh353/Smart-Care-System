import { Router } from "express";
import { pharmacyController } from "../controllers";
import { requireAuth, requireRoles } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRoles("pharmacy"));
router.get("/", pharmacyController.status);

export default router;
