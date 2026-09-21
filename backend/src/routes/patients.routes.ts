import { Router } from "express";
import { patientController } from "../controllers";
import { requireAuth, requireStaff } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireStaff);
router.get("/", patientController.list);

export default router;
