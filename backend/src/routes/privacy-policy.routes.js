import { Router } from "express";

import {
  analyzePrivacyPolicy,
  getLatestPrivacyPolicy,
} from "../controllers/privacy-policy.controller.js";
import { requireAuth, authorizeRoles } from "../middleware/auth.js";
import { uploadPrivacyPolicy } from "../middleware/upload.js";

const router = Router();

router.post(
  "/analyze",
  requireAuth,
  authorizeRoles("company"),
  uploadPrivacyPolicy.single("policy"),
  analyzePrivacyPolicy,
);
router.get("/latest", requireAuth, authorizeRoles("company"), getLatestPrivacyPolicy);

export default router;
