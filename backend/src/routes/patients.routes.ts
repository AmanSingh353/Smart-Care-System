import { Router } from "express";
import { patientController } from "../controllers";

const router = Router();

router.get("/", patientController.list);

export default router;
