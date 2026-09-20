import { Router } from "express";
import { labController } from "../controllers";

const router = Router();

router.get("/", labController.status);

export default router;
