import { Router } from "express";
import { familyController } from "../controllers";
import { requireAuth } from "../middleware/auth";

const router = Router();

/** Family may call with family demo token; staff must not use this for elevated access. */
router.use(requireAuth);
router.get("/", familyController.status);

export default router;
