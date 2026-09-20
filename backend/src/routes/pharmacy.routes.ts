import { Router } from "express";
import { pharmacyController } from "../controllers";

const router = Router();

router.get("/", pharmacyController.status);

export default router;
