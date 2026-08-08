import { Router } from "express";

import { getCompanyAnalytics, getUserAnalytics } from "../controllers/analytics.controller.js";
import { authorizeRoles, requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/company", requireAuth, authorizeRoles("company"), getCompanyAnalytics);
router.get("/user", requireAuth, authorizeRoles("user"), getUserAnalytics);

export default router;
