import { Router } from "express";

import {
  createDeletionRequest,
  getDeletionRequestById,
  getDeletionRequests,
  updateDeletionRequestStatus,
} from "../controllers/deletion-request.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, createDeletionRequest);
router.get("/", requireAuth, getDeletionRequests);
router.get("/:id", requireAuth, getDeletionRequestById);
router.patch("/:id/status", requireAuth, updateDeletionRequestStatus);

export default router;
