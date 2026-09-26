import { Router } from "express";
import { requireAuth, requireStaff } from "../middleware/auth";
import { assistanceController } from "../controllers/networkController";

const router = Router();

router.use(requireAuth, requireStaff);

router.get("/", assistanceController.list);
router.post("/", assistanceController.create);
router.get("/:id/patient-summary", assistanceController.patientSummary);
router.get("/:id/patient-record", assistanceController.patientRecord);
router.get("/:id", assistanceController.get);
router.patch("/:id/status", assistanceController.updateStatus);

export default router;
