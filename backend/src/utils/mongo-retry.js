import { setTimeout as wait } from "node:timers/promises";

const TRANSIENT_MONGO_ERROR_LABELS = [
  "ResetPool",
  "RetryableWriteError",
  "PoolRequestedRetry",
  "PoolRequstedRetry",
];
const TRANSIENT_ERROR_CODES = ["ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR"];
const TRANSIENT_ERROR_NAMES = ["MongoNetworkError", "MongoPoolClearedError"];
const TRANSIENT_ERROR_MESSAGE_PATTERNS = [
  /tlsv1 alert internal error/i,
  /ssl3_read_bytes/i,
  /SSL routines/i,
];

const hasErrorLabel = (error, label) => {
  if (typeof error.hasErrorLabel === "function") {
    return error.hasErrorLabel(label);
  }

  return Boolean(error.errorLabelSet?.has?.(label));
};

const isTransientMongoNetworkError = (error) => {
  if (TRANSIENT_ERROR_NAMES.includes(error.name)) {
    return true;
  }

  if (TRANSIENT_ERROR_CODES.includes(error.code) || TRANSIENT_ERROR_CODES.includes(error.cause?.code)) {
    return true;
  }

  const message = `${error.message || ""} ${error.cause?.message || ""}`;
  if (TRANSIENT_ERROR_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))) {
    return true;
  }

  return TRANSIENT_MONGO_ERROR_LABELS.some((label) => hasErrorLabel(error, label));
};

export const withMongoRetry = async (operation, { retries = 2, delayMs = 300 } = {}) => {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isTransientMongoNetworkError(error) || attempt === retries) {
        throw error;
      }

      await wait(delayMs * (attempt + 1));
    }
  }

  throw lastError;
};
