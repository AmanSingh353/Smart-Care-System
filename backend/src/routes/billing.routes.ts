import { Router } from "express";
import { billingController } from "../controllers";
import { requireAuth, requireRoles } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRoles("billing"));
router.get("/", billingController.status);

export default router;
