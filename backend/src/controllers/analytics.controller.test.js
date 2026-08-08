import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { AuditLog } from "../models/AuditLog.js";
import { Consent } from "../models/Consent.js";
import { DataDeletionRequest } from "../models/DataDeletionRequest.js";
import { PrivacyPolicy } from "../models/PrivacyPolicy.js";
import { runController } from "../test-utils/controller.js";
import { getCompanyAnalytics, getUserAnalytics } from "./analytics.controller.js";

const originalMethods = {
  auditFind: AuditLog.find,
  consentFind: Consent.find,
  deletionFind: DataDeletionRequest.find,
  policyFindOne: PrivacyPolicy.findOne,
};

const ids = {
  company: "64f400000000000000000001",
  user: "64f400000000000000000002",
  otherUser: "64f400000000000000000003",
  resource: "64f400000000000000000004",
};

const company = { _id: { toString: () => ids.company }, role: "company" };
const user = { _id: { toString: () => ids.user }, role: "user" };
const objectId = (id) => ({ toString: () => id });

const consents = [
  {
    _id: objectId("64f400000000000000000011"),
    userId: objectId(ids.user),
    companyId: objectId(ids.company),
    status: "granted",
    updatedAt: new Date("2026-08-08T05:00:00.000Z"),
  },
  {
    _id: objectId("64f400000000000000000012"),
    userId: objectId(ids.otherUser),
    companyId: objectId(ids.company),
    status: "withdrawn",
    updatedAt: new Date("2026-08-08T05:30:00.000Z"),
  },
];

const deletionRequests = [
  {
    _id: objectId("64f400000000000000000021"),
    userId: objectId(ids.user),
    companyId: objectId(ids.company),
    status: "pending",
    requestedAt: new Date("2026-08-08T06:00:00.000Z"),
    processedAt: null,
    updatedAt: new Date("2026-08-08T06:00:00.000Z"),
  },
  {
    _id: objectId("64f400000000000000000022"),
    userId: objectId(ids.otherUser),
    companyId: objectId(ids.company),
    status: "completed",
    requestedAt: new Date("2026-08-08T06:30:00.000Z"),
    processedAt: new Date("2026-08-08T07:00:00.000Z"),
    updatedAt: new Date("2026-08-08T07:00:00.000Z"),
  },
];

const auditLogs = [
  {
    _id: objectId("64f400000000000000000031"),
    userId: objectId(ids.user),
    companyId: objectId(ids.company),
    action: "CONSENT_GRANTED",
    resourceType: "Consent",
    resourceId: objectId(ids.resource),
    metadata: { status: "granted", actorId: ids.user },
    timestamp: new Date("2026-08-08T08:00:00.000Z"),
  },
  {
    _id: objectId("64f400000000000000000032"),
    userId: objectId(ids.user),
    companyId: objectId(ids.company),
    action: "DELETION_REQUEST_CREATED",
    resourceType: "DataDeletionRequest",
    resourceId: objectId(ids.resource),
    metadata: { status: "pending", actorId: ids.user },
    timestamp: new Date("2026-08-08T08:30:00.000Z"),
  },
];

const latestPolicy = {
  _id: objectId("64f400000000000000000041"),
  companyId: objectId(ids.company),
  complianceScore: 84,
  riskLevel: "Medium",
  analysis: {
    complianceGaps: ["Retention missing", "Grievance unclear"],
  },
  createdAt: new Date("2026-08-08T09:00:00.000Z"),
};

const filterByQuery = (items, query) =>
  items.filter((item) => {
    if (query.companyId) return item.companyId.toString() === query.companyId.toString();
    if (query.userId) return item.userId.toString() === query.userId.toString();
    return true;
  });

const chain = (items, query) => ({
  sort: () => ({
    limit: async () => filterByQuery(items, query),
    then: (resolve) => resolve(filterByQuery(items, query)),
  }),
});

beforeEach(() => {
  Consent.find = (query) => chain(consents, query);
  DataDeletionRequest.find = (query) => chain(deletionRequests, query);
  AuditLog.find = (query) => chain(auditLogs, query);
  PrivacyPolicy.findOne = () => ({
    sort: async () => latestPolicy,
  });
});

afterEach(() => {
  AuditLog.find = originalMethods.auditFind;
  Consent.find = originalMethods.consentFind;
  DataDeletionRequest.find = originalMethods.deletionFind;
  PrivacyPolicy.findOne = originalMethods.policyFindOne;
});

describe("analytics controllers", () => {
  it("returns company analytics from real records", async () => {
    const response = await runController(getCompanyAnalytics, {
      user: company,
    });

    assert.equal(response.res.statusCode, 200);
    assert.equal(response.res.body.analytics.totalUsers, 2);
    assert.equal(response.res.body.analytics.totalConsents, 2);
    assert.equal(response.res.body.analytics.grantedConsents, 1);
    assert.equal(response.res.body.analytics.withdrawnConsents, 1);
    assert.equal(response.res.body.analytics.pendingDeletionRequests, 1);
    assert.equal(response.res.body.analytics.acceptedDeletionRequests, 0);
    assert.equal(response.res.body.analytics.completedDeletionRequests, 1);
    assert.equal(response.res.body.analytics.latestComplianceScore, 84);
    assert.equal(response.res.body.analytics.totalComplianceGaps, 2);
  });

  it("returns user analytics from real records", async () => {
    const response = await runController(getUserAnalytics, {
      user,
    });

    assert.equal(response.res.statusCode, 200);
    assert.equal(response.res.body.analytics.totalConsents, 1);
    assert.equal(response.res.body.analytics.grantedConsents, 1);
    assert.equal(response.res.body.analytics.withdrawnConsents, 0);
    assert.equal(response.res.body.analytics.activeDeletionRequest.status, "pending");
    assert.equal(response.res.body.analytics.recentPrivacyActivity.length, 2);
  });
});
