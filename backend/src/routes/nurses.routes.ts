import { Router } from "express";
import { nurseController } from "../controllers";
import { requireAuth, requireRoles } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRoles("nurse"));
router.get("/", nurseController.status);

export default router;
