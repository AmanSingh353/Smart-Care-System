import { Router } from "express";
import { labController } from "../controllers";
import { requireAuth, requireRoles } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRoles("lab"));
router.get("/", labController.status);

export default router;
