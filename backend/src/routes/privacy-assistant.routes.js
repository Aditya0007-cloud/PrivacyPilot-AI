import { Router } from "express";

import { chatWithPrivacyAssistant } from "../controllers/privacy-assistant.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/chat", requireAuth, chatWithPrivacyAssistant);

export default router;
