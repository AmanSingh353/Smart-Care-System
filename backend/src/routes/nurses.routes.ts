import { Router } from "express";
import { nurseController } from "../controllers";

const router = Router();

router.get("/", nurseController.status);

export default router;
