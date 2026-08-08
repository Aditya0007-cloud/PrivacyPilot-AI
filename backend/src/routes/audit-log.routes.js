import { Router } from "express";

import { getAuditLogs } from "../controllers/audit-log.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, getAuditLogs);

export default router;
