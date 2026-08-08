import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { AuditLog } from "../models/AuditLog.js";
import { runController } from "../test-utils/controller.js";
import { getAuditLogs } from "./audit-log.controller.js";

const originalMethods = {
  countDocuments: AuditLog.countDocuments,
  find: AuditLog.find,
};

const ids = {
  company: "64f300000000000000000001",
  otherCompany: "64f300000000000000000002",
  user: "64f300000000000000000003",
  otherUser: "64f300000000000000000004",
  resource: "64f300000000000000000005",
};

const users = {
  company: { _id: { toString: () => ids.company }, role: "company" },
  user: { _id: { toString: () => ids.user }, role: "user" },
};

const objectId = (id) => ({ toString: () => id });

let logs;

const makeLog = (overrides = {}) => ({
  _id: objectId(overrides.id || ids.resource),
  userId: objectId(overrides.userId || ids.user),
  companyId: objectId(overrides.companyId || ids.company),
  action: overrides.action || "CONSENT_GRANTED",
  resourceType: overrides.resourceType || "Consent",
  resourceId: objectId(overrides.resourceId || ids.resource),
  metadata: overrides.metadata || { status: "granted", actorId: ids.user },
  timestamp: overrides.timestamp || new Date("2026-08-08T06:00:00.000Z"),
});

const matchesQuery = (log, query) => {
  if (query.companyId && log.companyId.toString() !== query.companyId.toString()) return false;
  if (query.userId && log.userId.toString() !== query.userId.toString()) return false;
  if (query.action && log.action !== query.action) return false;
  if (query.timestamp?.$gte && log.timestamp < query.timestamp.$gte) return false;
  if (query.timestamp?.$lte && log.timestamp > query.timestamp.$lte) return false;
  return true;
};

beforeEach(() => {
  logs = [
    makeLog({ id: "64f300000000000000000011", action: "CONSENT_GRANTED" }),
    makeLog({
      id: "64f300000000000000000012",
      action: "DELETION_REQUEST_CREATED",
      resourceType: "DataDeletionRequest",
      timestamp: new Date("2026-08-08T07:00:00.000Z"),
    }),
    makeLog({
      id: "64f300000000000000000013",
      companyId: ids.otherCompany,
      userId: ids.otherUser,
      action: "CONSENT_WITHDRAWN",
    }),
  ];

  AuditLog.find = (query) => ({
    sort: () => ({
      skip: (skip) => ({
        limit: async (limit) =>
          logs
            .filter((log) => matchesQuery(log, query))
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(skip, skip + limit),
      }),
    }),
  });

  AuditLog.countDocuments = async (query) =>
    logs.filter((log) => matchesQuery(log, query)).length;
});

afterEach(() => {
  AuditLog.countDocuments = originalMethods.countDocuments;
  AuditLog.find = originalMethods.find;
});

describe("audit log controller", () => {
  it("authorizes company users to see only their company logs", async () => {
    const response = await runController(getAuditLogs, {
      user: users.company,
      query: {},
    });

    assert.equal(response.res.statusCode, 200);
    assert.equal(response.res.body.auditLogs.length, 2);
    assert.ok(response.res.body.auditLogs.every((log) => log.companyId === ids.company));
  });

  it("authorizes normal users to see only their own logs", async () => {
    const response = await runController(getAuditLogs, {
      user: users.user,
      query: {},
    });

    assert.equal(response.res.statusCode, 200);
    assert.equal(response.res.body.auditLogs.length, 2);
    assert.ok(response.res.body.auditLogs.every((log) => log.userId === ids.user));
  });

  it("supports action filtering and pagination", async () => {
    const response = await runController(getAuditLogs, {
      user: users.company,
      query: {
        action: "CONSENT_GRANTED",
        page: "1",
        limit: "1",
      },
    });

    assert.equal(response.res.statusCode, 200);
    assert.equal(response.res.body.auditLogs.length, 1);
    assert.equal(response.res.body.auditLogs[0].action, "CONSENT_GRANTED");
    assert.equal(response.res.body.pagination.total, 1);
  });
});
