import { Router } from "express";
import { requireAuth, requireStaff } from "../middleware/auth";
import { networkPatientController } from "../controllers/patientController";

const router = Router();

router.use(requireAuth, requireStaff);

router.get("/", networkPatientController.list);
router.post("/", networkPatientController.create);
router.get("/:patientId", networkPatientController.getByPatientId);

export default router;
