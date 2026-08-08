import { Router } from "express";

import {
  createConsent,
  getConsentOverview,
  getConsents,
  withdrawConsent,
} from "../controllers/consent.controller.js";
import { authorizeRoles, requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, createConsent);
router.get("/", requireAuth, getConsents);
router.get("/overview", requireAuth, authorizeRoles("company"), getConsentOverview);
router.patch("/:id/withdraw", requireAuth, authorizeRoles("user"), withdrawConsent);

export default router;
