import { Router } from "express";

import {
  createDataRightsRequest,
  getDataRightsRequestById,
  getDataRightsRequests,
  updateDataRightsRequestStatus,
} from "../controllers/deletion-request.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, createDataRightsRequest);
router.get("/", requireAuth, getDataRightsRequests);
router.get("/:id", requireAuth, getDataRightsRequestById);
router.patch("/:id/status", requireAuth, updateDataRightsRequestStatus);

export default router;
