import mongoose from "mongoose";

import { env } from "./env.js";
import { withMongoRetry } from "../utils/mongo-retry.js";

export const connectDatabase = async () => {
  mongoose.set("strictQuery", true);
  mongoose.set("bufferTimeoutMS", env.MONGODB_TIMEOUT_MS);

  const isSrvConnection = env.MONGODB_URI.startsWith("mongodb+srv://");

  const connection = await withMongoRetry(
    () =>
      mongoose.connect(env.MONGODB_URI, {
        maxConnecting: 1,
        maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
        minPoolSize: 0,
        retryReads: true,
        retryWrites: true,
        serverSelectionTimeoutMS: env.MONGODB_TIMEOUT_MS,
        tls: isSrvConnection ? true : undefined,
      }),
    { delayMs: 1000, retries: 6 },
  );
  console.log(`MongoDB connected: ${connection.connection.host}`);
};
