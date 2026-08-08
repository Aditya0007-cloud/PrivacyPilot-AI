import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

const startServer = async () => {
  try {
    await connectDatabase().catch((error) => {
      console.error("MongoDB connection failed", error.message);

      if (env.NODE_ENV === "production") {
        throw error;
      }

      console.warn("Continuing without MongoDB in development mode");
    });

    const server = app.listen(env.PORT, env.HOST, () => {
      console.log(`PrivacyPilot AI API running at http://${env.HOST}:${env.PORT}`);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${env.PORT} is already in use. Is another server running?`);
        process.exit(1);
      }
      console.error("Server error:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to start PrivacyPilot AI API", error);
    process.exit(1);
  }
};

startServer();
