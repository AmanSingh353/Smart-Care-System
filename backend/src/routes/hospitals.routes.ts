import { Router } from "express";
import { requireAuth, requireRoles, requireStaff } from "../middleware/auth";
import { hospitalController } from "../controllers/networkController";

const router = Router();

router.use(requireAuth, requireStaff);

router.get("/summary", hospitalController.summary);
router.get("/", hospitalController.list);
router.get("/:id", hospitalController.get);
router.post("/", requireRoles("admin"), hospitalController.create);
router.patch("/:id", requireRoles("admin"), hospitalController.update);

export default router;
