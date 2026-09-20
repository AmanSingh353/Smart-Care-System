import { Router } from "express";
import healthRoutes from "./health.routes";
import authRoutes from "./auth.routes";
import patientsRoutes from "./patients.routes";
import doctorsRoutes from "./doctors.routes";
import nursesRoutes from "./nurses.routes";
import labRoutes from "./lab.routes";
import pharmacyRoutes from "./pharmacy.routes";
import billingRoutes from "./billing.routes";
import familyRoutes from "./family.routes";
import adminRoutes from "./admin.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/patients", patientsRoutes);
router.use("/doctors", doctorsRoutes);
router.use("/nurses", nursesRoutes);
router.use("/lab", labRoutes);
router.use("/pharmacy", pharmacyRoutes);
router.use("/billing", billingRoutes);
router.use("/family", familyRoutes);
router.use("/admin", adminRoutes);

export default router;
