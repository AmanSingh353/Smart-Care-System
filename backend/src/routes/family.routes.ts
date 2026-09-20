import { Router } from "express";
import { familyController } from "../controllers";

const router = Router();

router.get("/", familyController.status);

export default router;
