import { Router } from "express";
import { requireAuth, requirePlatformAdmin, requireStaff } from "../middleware/auth";
import { platformController } from "../controllers/platformController";

const router = Router();

/** All platform routes require Firebase auth + StaffUser.isPlatformAdmin === true. */
router.use(requireAuth, requireStaff, requirePlatformAdmin);

router.get("/summary", platformController.summary);
router.get("/hospitals", platformController.list);
router.post("/hospitals", platformController.create);
router.get("/hospitals/:hospitalId", platformController.get);
router.patch("/hospitals/:hospitalId", platformController.update);
router.post("/hospitals/:hospitalId/admin", platformController.assignAdmin);

export default router;
