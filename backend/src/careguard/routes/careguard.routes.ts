import { Router } from "express";
import { requireAuth, requireStaff } from "../../middleware/auth";
import { careGuardController } from "../controllers/careGuardController";

const router = Router();

router.use(requireAuth);
router.use(requireStaff);

router.get("/patient/:patientId", careGuardController.getPatientSignals);
router.get("/role/:role", careGuardController.getRoleSignals);
router.get("/summary", careGuardController.getSummary);
router.get("/audit", careGuardController.audit);
router.post("/sync", careGuardController.syncPatients);
router.post("/:signalId/acknowledge", careGuardController.acknowledge);
router.post("/:signalId/resolve", careGuardController.resolve);
router.post("/:signalId/dismiss", careGuardController.dismiss);

export default router;
