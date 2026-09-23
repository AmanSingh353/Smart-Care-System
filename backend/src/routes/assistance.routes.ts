import { Router } from "express";
import { requireAuth, requireStaff } from "../middleware/auth";
import { assistanceController } from "../controllers/networkController";

const router = Router();

router.use(requireAuth, requireStaff);

router.get("/", assistanceController.list);
router.get("/:id", assistanceController.get);
router.post("/", assistanceController.create);
router.patch("/:id/status", assistanceController.updateStatus);

export default router;
