import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import auditLogRoutes from "./routes/audit-log.routes.js";
import authRoutes from "./routes/auth.routes.js";
import dataRightsRequestRoutes from "./routes/data-rights-request.routes.js";
import consentRoutes from "./routes/consent.routes.js";
import deletionRequestRoutes from "./routes/deletion-request.routes.js";
import healthRoutes from "./routes/health.routes.js";
import privacyAssistantRoutes from "./routes/privacy-assistant.routes.js";
import privacyPolicyRoutes from "./routes/privacy-policy.routes.js";

export const app = express();

const allowedOrigins = new Set([env.CLIENT_URL]);

if (env.NODE_ENV === "development") {
  allowedOrigins.add("http://127.0.0.1:5173");
}

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.get("/", (_req, res) => {
  res.json({
    name: "PrivacyPilot AI API",
    status: "online",
  });
});

app.use("/api/analytics", analyticsRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/consents", consentRoutes);
app.use("/api/requests", dataRightsRequestRoutes);
app.use("/api/deletion-requests", deletionRequestRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/privacy-assistant", privacyAssistantRoutes);
app.use("/api/privacy-policies", privacyPolicyRoutes);

app.use(errorHandler);
