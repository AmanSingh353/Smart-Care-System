import { Router } from "express";
import { billingController } from "../controllers";

const router = Router();

router.get("/", billingController.status);

export default router;
