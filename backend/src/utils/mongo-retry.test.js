import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { withMongoRetry } from "./mongo-retry.js";

describe("withMongoRetry", () => {
  it("retries Mongo TLS alert errors reported only in the message", async () => {
    let attempts = 0;

    const result = await withMongoRetry(
      async () => {
        attempts += 1;

        if (attempts === 1) {
          const error = new Error(
            "SSL routines:ssl3_read_bytes:tlsv1 alert internal error",
          );
          error.name = "MongoNetworkError";
          throw error;
        }

        return "connected";
      },
      { delayMs: 1, retries: 1 },
    );

    assert.equal(result, "connected");
    assert.equal(attempts, 2);
  });

  it("does not retry non-transient errors", async () => {
    let attempts = 0;
    const error = new Error("validation failed");

    await assert.rejects(
      withMongoRetry(
        async () => {
          attempts += 1;
          throw error;
        },
        { delayMs: 1, retries: 2 },
      ),
      error,
    );

    assert.equal(attempts, 1);
  });

  it("retries Mongo connection pool cleared errors", async () => {
    let attempts = 0;

    const result = await withMongoRetry(
      async () => {
        attempts += 1;

        if (attempts === 1) {
          const error = new Error("Connection pool was cleared");
          error.name = "MongoPoolClearedError";
          throw error;
        }

        return "retried";
      },
      { delayMs: 1, retries: 1 },
    );

    assert.equal(result, "retried");
    assert.equal(attempts, 2);
  });
});
