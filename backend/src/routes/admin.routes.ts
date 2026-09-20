import { Router } from "express";
import { adminController } from "../controllers";

const router = Router();

router.get("/", adminController.status);

export default router;
