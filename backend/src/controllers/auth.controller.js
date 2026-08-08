import bcrypt from "bcryptjs";

import { User } from "../models/User.js";
import { ensureDemoData } from "../services/demo-data.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { signAuthToken } from "../utils/jwt.js";
import { withMongoRetry } from "../utils/mongo-retry.js";

const VALID_ROLES = new Set(["company", "user"]);

const sanitizeUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

const normalizeEmail = (email) => email.trim().toLowerCase();

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "Name, email, password, and role are required" });
  }

  if (!VALID_ROLES.has(role)) {
    return res.status(400).json({ message: "Role must be either company or user" });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role,
  });

  const token = signAuthToken(user);

  return res.status(201).json({
    token,
    user: sanitizeUser(user),
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email: normalizeEmail(email) }).select("+password");

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = signAuthToken(user);

  return res.json({
    token,
    user: sanitizeUser(user),
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  return res.json({
    user: sanitizeUser(req.user),
  });
});

export const loginDemo = asyncHandler(async (req, res) => {
  const role = req.body.role || "company";

  if (!VALID_ROLES.has(role)) {
    return res.status(400).json({ message: "Role must be either company or user" });
  }

  const demoData = await withMongoRetry(() => ensureDemoData());
  const user = role === "company" ? demoData.company : demoData.users[0];
  const token = signAuthToken(user);

  return res.json({
    token,
    user: sanitizeUser(user),
    demo: {
      company: {
        id: demoData.company._id.toString(),
        name: demoData.company.name,
        email: demoData.company.email,
      },
      accounts: {
        company: {
          email: demoData.accounts.company.email,
          password: demoData.password,
        },
        user: {
          email: demoData.accounts.users[0].email,
          password: demoData.password,
        },
      },
    },
  });
});
