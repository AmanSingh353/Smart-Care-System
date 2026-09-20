import { Router } from "express";
import { doctorController } from "../controllers";

const router = Router();

router.get("/", doctorController.status);

export default router;
