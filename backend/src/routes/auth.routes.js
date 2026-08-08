import { Router } from "express";

import {
  getCurrentUser,
  login,
  loginDemo,
  register,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/demo", loginDemo);
router.get("/me", requireAuth, getCurrentUser);

export default router;
