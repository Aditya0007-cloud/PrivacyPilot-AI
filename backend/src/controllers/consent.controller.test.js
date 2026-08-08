import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { AuditLog } from "../models/AuditLog.js";
import { Consent } from "../models/Consent.js";
import { User } from "../models/User.js";
import { runController } from "../test-utils/controller.js";
import {
  createConsent,
  getConsentOverview,
  getConsents,
  withdrawConsent,
} from "./consent.controller.js";

const originalMethods = {
  auditLogCreate: AuditLog.create,
  consentCreate: Consent.create,
  consentFind: Consent.find,
  consentFindById: Consent.findById,
  consentFindOne: Consent.findOne,
  userFindById: User.findById,
};

const ids = {
  company: "64f000000000000000000001",
  user: "64f000000000000000000002",
  otherUser: "64f000000000000000000003",
  consent: "64f000000000000000000004",
  otherConsent: "64f000000000000000000005",
};

const users = {
  company: {
    _id: { toString: () => ids.company },
    name: "Asha Company",
    email: "company@example.com",
    role: "company",
  },
  user: {
    _id: { toString: () => ids.user },
    name: "Data Principal",
    email: "user@example.com",
    role: "user",
  },
  otherUser: {
    _id: { toString: () => ids.otherUser },
    name: "Other User",
    email: "other@example.com",
    role: "user",
  },
};

let consents;
let auditLogs;

const now = new Date("2026-08-08T02:00:00.000Z");

const objectId = (id) => ({ toString: () => id });

const makeConsent = (overrides = {}) => ({
  _id: objectId(overrides.id || ids.consent),
  userId: objectId(overrides.userId || ids.user),
  companyId: objectId(overrides.companyId || ids.company),
  purpose: overrides.purpose || "Marketing Communications",
  dataCategory: overrides.dataCategory || "Email + Phone",
  description: overrides.description || "Receive promotional communications",
  status: overrides.status || "granted",
  grantedAt: overrides.grantedAt || now,
  withdrawnAt: overrides.withdrawnAt || null,
  createdAt: overrides.createdAt || now,
  updatedAt: overrides.updatedAt || now,
  save: async function save() {
    this.updatedAt = new Date("2026-08-08T03:00:00.000Z");
    consents.set(this._id.toString(), this);
    return this;
  },
});

const consentPayload = {
  companyId: ids.company,
  purpose: "Personalized Recommendations",
  dataCategory: "Browsing Activity",
  description: "Improve recommendations",
};

beforeEach(() => {
  auditLogs = [];
  consents = new Map();
  consents.set(ids.consent, makeConsent());
  consents.set(
    ids.otherConsent,
    makeConsent({
      id: ids.otherConsent,
      userId: ids.otherUser,
      purpose: "Third-party Analytics",
      dataCategory: "Usage Data",
      description: "Analytics and product improvement",
    }),
  );

  User.findById = async (id) => {
    const value = id.toString ? id.toString() : id;

    if (value === ids.company) return users.company;
    if (value === ids.user) return users.user;
    if (value === ids.otherUser) return users.otherUser;
    return null;
  };

  Consent.create = async (payload) => {
    const consent = makeConsent({
      id: `64f00000000000000000000${consents.size + 6}`,
      userId: payload.userId.toString(),
      companyId: payload.companyId.toString(),
      purpose: payload.purpose,
      dataCategory: payload.dataCategory,
      description: payload.description,
      status: payload.status,
      grantedAt: payload.grantedAt,
      createdAt: now,
      updatedAt: now,
    });

    consents.set(consent._id.toString(), consent);
    return consent;
  };

  Consent.find = (query) => ({
    sort: async () =>
      [...consents.values()].filter((consent) => {
        if (query.userId) return consent.userId.toString() === query.userId.toString();
        if (query.companyId) return consent.companyId.toString() === query.companyId.toString();
        return true;
      }),
  });

  Consent.findById = async (id) => consents.get(id) || null;
  Consent.findOne = async (query) =>
    [...consents.values()].find((consent) => {
      return (
        consent.userId.toString() === query.userId.toString() &&
        consent.companyId.toString() === query.companyId.toString() &&
        consent.purpose === query.purpose &&
        consent.dataCategory === query.dataCategory &&
        consent.status === query.status
      );
    }) || null;
  AuditLog.create = async (payload) => {
    auditLogs.push(payload);
    return payload;
  };
});

afterEach(() => {
  AuditLog.create = originalMethods.auditLogCreate;
  Consent.create = originalMethods.consentCreate;
  Consent.find = originalMethods.consentFind;
  Consent.findById = originalMethods.consentFindById;
  Consent.findOne = originalMethods.consentFindOne;
  User.findById = originalMethods.userFindById;
});

describe("consent controllers", () => {
  it("grants consent and creates an audit log", async () => {
    const response = await runController(createConsent, {
      user: users.user,
      body: consentPayload,
    });

    assert.equal(response.res.statusCode, 201);
    assert.equal(response.res.body.consent.status, "granted");
    assert.equal(response.res.body.consent.userId, ids.user);
    assert.equal(response.res.body.consent.companyId, ids.company);
    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].action, "CONSENT_GRANTED");
    assert.equal(auditLogs[0].resourceType, "Consent");
    assert.equal(auditLogs[0].metadata.actorType, "USER");
  });

  it("allows a company to grant consent for an existing user", async () => {
    const response = await runController(createConsent, {
      user: users.company,
      body: {
        userId: ids.otherUser,
        purpose: "Customer Support Follow-up",
        dataCategory: "Support Tickets",
        description: "Contact the user about open support tickets",
      },
    });

    assert.equal(response.res.statusCode, 201);
    assert.equal(response.res.body.consent.userId, ids.otherUser);
    assert.equal(response.res.body.consent.companyId, ids.company);
    assert.equal(response.res.body.consent.status, "granted");
    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].metadata.actorType, "COMPANY");
  });

  it("rejects blank consent fields after trimming", async () => {
    const response = await runController(createConsent, {
      user: users.user,
      body: {
        companyId: ids.company,
        purpose: "   ",
        dataCategory: "Browsing Activity",
        description: "Improve recommendations",
      },
    });

    assert.equal(response.res.statusCode, 400);
    assert.equal(response.res.body.message, "Purpose is required");
    assert.equal(auditLogs.length, 0);
  });

  it("prevents duplicate active consent for the same purpose and data category", async () => {
    const response = await runController(createConsent, {
      user: users.user,
      body: {
        companyId: ids.company,
        purpose: "Marketing Communications",
        dataCategory: "Email + Phone",
        description: "Receive promotional communications again",
      },
    });

    assert.equal(response.res.statusCode, 409);
    assert.equal(
      response.res.body.message,
      "Active consent already exists for this purpose and data category",
    );
    assert.equal(auditLogs.length, 0);
  });

  it("requires user-created consent to target a company account", async () => {
    const response = await runController(createConsent, {
      user: users.user,
      body: {
        companyId: ids.otherUser,
        purpose: "Personalized Recommendations",
        dataCategory: "Browsing Activity",
        description: "Improve recommendations",
      },
    });

    assert.equal(response.res.statusCode, 404);
    assert.equal(response.res.body.message, "Company account not found");
    assert.equal(auditLogs.length, 0);
  });

  it("requires company-created consent to target a user account", async () => {
    const response = await runController(createConsent, {
      user: users.company,
      body: {
        userId: ids.company,
        purpose: "Customer Support Follow-up",
        dataCategory: "Support Tickets",
        description: "Contact the user about open support tickets",
      },
    });

    assert.equal(response.res.statusCode, 404);
    assert.equal(response.res.body.message, "User account not found");
    assert.equal(auditLogs.length, 0);
  });

  it("retrieves only the authenticated user's own consents", async () => {
    const response = await runController(getConsents, {
      user: users.user,
    });

    assert.equal(response.res.statusCode, 200);
    assert.equal(response.res.body.consents.length, 1);
    assert.equal(response.res.body.consents[0].userId, ids.user);
  });

  it("allows a company to retrieve records belonging to that company", async () => {
    const response = await runController(getConsents, {
      user: users.company,
    });

    assert.equal(response.res.statusCode, 200);
    assert.equal(response.res.body.consents.length, 2);
    assert.ok(response.res.body.consents.every((consent) => consent.companyId === ids.company));
  });

  it("withdraws own consent and creates an audit log", async () => {
    const response = await runController(withdrawConsent, {
      user: users.user,
      params: {
        id: ids.consent,
      },
    });

    assert.equal(response.res.statusCode, 200);
    assert.equal(response.res.body.consent.status, "withdrawn");
    assert.ok(response.res.body.consent.withdrawnAt);
    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].action, "CONSENT_WITHDRAWN");
    assert.equal(auditLogs[0].metadata.purpose, "Marketing Communications");
    assert.equal(auditLogs[0].metadata.actorType, "USER");
  });

  it("prevents access to another user's consent", async () => {
    const response = await runController(withdrawConsent, {
      user: users.user,
      params: {
        id: ids.otherConsent,
      },
    });

    assert.equal(response.res.statusCode, 403);
    assert.equal(auditLogs.length, 0);
  });

  it("prevents a second withdrawal", async () => {
    const existingConsent = consents.get(ids.consent);
    existingConsent.status = "withdrawn";
    existingConsent.withdrawnAt = now;

    const response = await runController(withdrawConsent, {
      user: users.user,
      params: {
        id: ids.consent,
      },
    });

    assert.equal(response.res.statusCode, 409);
    assert.equal(auditLogs.length, 0);
  });

  it("returns company consent overview from real records", async () => {
    consents.get(ids.otherConsent).status = "withdrawn";

    const response = await runController(getConsentOverview, {
      user: users.company,
    });

    assert.equal(response.res.statusCode, 200);
    assert.equal(response.res.body.overview.total, 2);
    assert.equal(response.res.body.overview.granted, 1);
    assert.equal(response.res.body.overview.withdrawn, 1);
    assert.equal(response.res.body.overview.recentActivity.length, 2);
  });
});
