import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { AuditLog } from "../models/AuditLog.js";
import { DataDeletionRequest } from "../models/DataDeletionRequest.js";
import { runController } from "../test-utils/controller.js";
import {
  createDeletionRequest,
  getDeletionRequestById,
  getDeletionRequests,
  updateDeletionRequestStatus,
} from "./deletion-request.controller.js";

const originalMethods = {
  auditLogCreate: AuditLog.create,
  requestCreate: DataDeletionRequest.create,
  requestFind: DataDeletionRequest.find,
  requestFindById: DataDeletionRequest.findById,
  requestFindOne: DataDeletionRequest.findOne,
};

const ids = {
  company: "64f100000000000000000001",
  otherCompany: "64f100000000000000000002",
  user: "64f100000000000000000003",
  otherUser: "64f100000000000000000004",
  request: "64f100000000000000000005",
  otherRequest: "64f100000000000000000006",
};

const users = {
  company: {
    _id: { toString: () => ids.company },
    name: "Asha Company",
    role: "company",
  },
  otherCompany: {
    _id: { toString: () => ids.otherCompany },
    name: "Other Company",
    role: "company",
  },
  user: {
    _id: { toString: () => ids.user },
    name: "Data Principal",
    role: "user",
  },
  otherUser: {
    _id: { toString: () => ids.otherUser },
    name: "Other User",
    role: "user",
  },
};

let deletionRequests;
let auditLogs;

const now = new Date("2026-08-08T04:00:00.000Z");

const objectId = (id) => ({ toString: () => id });

const makeDeletionRequest = (overrides = {}) => ({
  _id: objectId(overrides.id || ids.request),
  requestNumber: overrides.requestNumber || "REQ-1001",
  userId: objectId(overrides.userId || ids.user),
  companyId: objectId(overrides.companyId || ids.company),
  customerId: overrides.customerId || "CUST-10482",
  requestType: overrides.requestType || "data_deletion",
  description: overrides.description || "Please delete my personal data from this company.",
  reason: overrides.reason || "Please delete my personal data from this company.",
  status: overrides.status || "pending",
  requestedAt: overrides.requestedAt || now,
  reviewedAt: overrides.reviewedAt || null,
  acceptedAt: overrides.acceptedAt || null,
  rejectedAt: overrides.rejectedAt || null,
  processingStartedAt: overrides.processingStartedAt || null,
  completedAt: overrides.completedAt || null,
  processedAt: overrides.processedAt || null,
  processedBy: overrides.processedBy ? objectId(overrides.processedBy) : null,
  rejectionReason: overrides.rejectionReason || "",
  completionNote: overrides.completionNote || "",
  companyResponse: overrides.companyResponse || "",
  createdAt: overrides.createdAt || now,
  updatedAt: overrides.updatedAt || now,
  save: async function save() {
    this.updatedAt = new Date("2026-08-08T05:00:00.000Z");
    deletionRequests.set(this._id.toString(), this);
    return this;
  },
});

const requestPayload = {
  companyId: ids.company,
  customerId: "CUST-10482",
  requestType: "data_deletion",
  description: "Please delete personal data associated with my account.",
};

beforeEach(() => {
  auditLogs = [];
  deletionRequests = new Map();
  deletionRequests.set(ids.request, makeDeletionRequest());
  deletionRequests.set(
    ids.otherRequest,
    makeDeletionRequest({
      id: ids.otherRequest,
      userId: ids.otherUser,
      companyId: ids.otherCompany,
      status: "completed",
    }),
  );

  DataDeletionRequest.create = async (payload) => {
    const deletionRequest = makeDeletionRequest({
      id: `64f10000000000000000000${deletionRequests.size + 7}`,
      requestNumber: payload.requestNumber,
      userId: payload.userId.toString(),
      companyId: payload.companyId.toString(),
      customerId: payload.customerId,
      requestType: payload.requestType,
      description: payload.description,
      reason: payload.reason,
      status: payload.status,
      requestedAt: payload.requestedAt,
      createdAt: now,
      updatedAt: now,
    });

    deletionRequests.set(deletionRequest._id.toString(), deletionRequest);
    return deletionRequest;
  };

  DataDeletionRequest.findOne = async (query) =>
    [...deletionRequests.values()].find((request) => {
      const sameUser = request.userId.toString() === query.userId.toString();
      const sameCompany = request.companyId.toString() === query.companyId.toString();
      const sameCustomer = request.customerId === query.customerId;
      const sameType = request.requestType === query.requestType;
      const active = query.status.$in.includes(request.status);
      return sameUser && sameCompany && sameCustomer && sameType && active;
    }) || null;

  DataDeletionRequest.find = (query) => ({
    sort: async () =>
      [...deletionRequests.values()].filter((request) => {
        if (query.userId) return request.userId.toString() === query.userId.toString();
        if (query.companyId) return request.companyId.toString() === query.companyId.toString();
        return true;
      }),
  });

  DataDeletionRequest.findById = async (id) => deletionRequests.get(id) || null;
  AuditLog.create = async (payload) => {
    auditLogs.push(payload);
    return payload;
  };
});

afterEach(() => {
  AuditLog.create = originalMethods.auditLogCreate;
  DataDeletionRequest.create = originalMethods.requestCreate;
  DataDeletionRequest.find = originalMethods.requestFind;
  DataDeletionRequest.findById = originalMethods.requestFindById;
  DataDeletionRequest.findOne = originalMethods.requestFindOne;
});

describe("data rights request controllers", () => {
  it("allows a user to create a privacy request and writes an audit log", async () => {
    deletionRequests.delete(ids.request);

    const response = await runController(createDeletionRequest, {
      user: users.user,
      body: requestPayload,
    });

    assert.equal(response.res.statusCode, 201);
    assert.equal(response.res.body.deletionRequest.userId, ids.user);
    assert.equal(response.res.body.deletionRequest.companyId, ids.company);
    assert.equal(response.res.body.deletionRequest.customerId, "CUST-10482");
    assert.equal(response.res.body.deletionRequest.requestType, "data_deletion");
    assert.equal(response.res.body.deletionRequest.status, "pending");
    assert.ok(response.res.body.request.id);
    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].action, "DATA_RIGHTS_REQUEST_SUBMITTED");
    assert.equal(auditLogs[0].resourceType, "DataRightsRequest");
    assert.equal(auditLogs[0].metadata.actorType, "USER");
  });

  it("allows a user to see only their own requests", async () => {
    const response = await runController(getDeletionRequests, {
      user: users.user,
    });

    assert.equal(response.res.statusCode, 200);
    assert.equal(response.res.body.deletionRequests.length, 1);
    assert.equal(response.res.body.deletionRequests[0].userId, ids.user);
    assert.equal(response.res.body.requests.length, 1);
  });

  it("allows a user to access only their own request details", async () => {
    const ownResponse = await runController(getDeletionRequestById, {
      user: users.user,
      params: {
        id: ids.request,
      },
    });
    const otherResponse = await runController(getDeletionRequestById, {
      user: users.user,
      params: {
        id: ids.otherRequest,
      },
    });

    assert.equal(ownResponse.res.statusCode, 200);
    assert.equal(ownResponse.res.body.request.id, ids.request);
    assert.equal(otherResponse.res.statusCode, 403);
  });

  it("prevents duplicate active requests for the same company, customer, and type", async () => {
    const response = await runController(createDeletionRequest, {
      user: users.user,
      body: requestPayload,
    });

    assert.equal(response.res.statusCode, 409);
    assert.equal(auditLogs.length, 0);
  });

  it("allows a company to see only its own company's requests", async () => {
    const response = await runController(getDeletionRequests, {
      user: users.company,
    });

    assert.equal(response.res.statusCode, 200);
    assert.equal(response.res.body.deletionRequests.length, 1);
    assert.equal(response.res.body.deletionRequests[0].companyId, ids.company);
  });

  it("allows a company to accept a pending request and writes an audit log", async () => {
    const response = await runController(updateDeletionRequestStatus, {
      user: users.company,
      params: {
        id: ids.request,
      },
      body: {
        status: "accepted",
      },
    });

    assert.equal(response.res.statusCode, 200);
    assert.equal(response.res.body.deletionRequest.status, "accepted");
    assert.ok(response.res.body.deletionRequest.acceptedAt);
    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].action, "DATA_RIGHTS_REQUEST_ACCEPTED");
  });

  it("allows a company to move an accepted request to in progress", async () => {
    deletionRequests.set(ids.request, makeDeletionRequest({ status: "accepted" }));

    const response = await runController(updateDeletionRequestStatus, {
      user: users.company,
      params: {
        id: ids.request,
      },
      body: {
        status: "in_progress",
      },
    });

    assert.equal(response.res.statusCode, 200);
    assert.equal(response.res.body.deletionRequest.status, "in_progress");
    assert.ok(response.res.body.deletionRequest.processingStartedAt);
    assert.equal(auditLogs[0].action, "DATA_RIGHTS_REQUEST_PROCESSING_STARTED");
  });

  it("records processedAt, processedBy, and completion note when completed", async () => {
    deletionRequests.set(ids.request, makeDeletionRequest({ status: "in_progress" }));

    const response = await runController(updateDeletionRequestStatus, {
      user: users.company,
      params: {
        id: ids.request,
      },
      body: {
        status: "completed",
        completionNote: "Data export was securely delivered.",
      },
    });

    assert.equal(response.res.statusCode, 200);
    assert.equal(response.res.body.deletionRequest.status, "completed");
    assert.ok(response.res.body.deletionRequest.processedAt);
    assert.ok(response.res.body.deletionRequest.completedAt);
    assert.equal(response.res.body.deletionRequest.processedBy, ids.company);
    assert.equal(response.res.body.deletionRequest.completionNote, "Data export was securely delivered.");
    assert.equal(auditLogs[0].action, "DATA_RIGHTS_REQUEST_COMPLETED");
  });

  it("prevents a user from changing status", async () => {
    const response = await runController(updateDeletionRequestStatus, {
      user: users.user,
      params: {
        id: ids.request,
      },
      body: {
        status: "accepted",
      },
    });

    assert.equal(response.res.statusCode, 403);
    assert.equal(auditLogs.length, 0);
  });

  it("requires a rejection reason", async () => {
    const response = await runController(updateDeletionRequestStatus, {
      user: users.company,
      params: {
        id: ids.request,
      },
      body: {
        status: "rejected",
      },
    });

    assert.equal(response.res.statusCode, 400);
    assert.equal(auditLogs.length, 0);
  });

  it("rejects with a reason and writes an audit log", async () => {
    const response = await runController(updateDeletionRequestStatus, {
      user: users.company,
      params: {
        id: ids.request,
      },
      body: {
        status: "rejected",
        rejectionReason: "Legal retention requirements apply.",
      },
    });

    assert.equal(response.res.statusCode, 200);
    assert.equal(response.res.body.deletionRequest.status, "rejected");
    assert.equal(
      response.res.body.deletionRequest.rejectionReason,
      "Legal retention requirements apply.",
    );
    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].action, "DATA_RIGHTS_REQUEST_REJECTED");
    assert.equal(auditLogs[0].metadata.rejectionReason, "Legal retention requirements apply.");
  });

  it("prevents companies from updating another company's requests", async () => {
    const response = await runController(updateDeletionRequestStatus, {
      user: users.company,
      params: {
        id: ids.otherRequest,
      },
      body: {
        status: "accepted",
      },
    });

    assert.equal(response.res.statusCode, 403);
    assert.equal(auditLogs.length, 0);
  });

  it("rejects invalid status transitions", async () => {
    const response = await runController(updateDeletionRequestStatus, {
      user: users.company,
      params: {
        id: ids.request,
      },
      body: {
        status: "completed",
      },
    });

    assert.equal(response.res.statusCode, 409);
    assert.equal(auditLogs.length, 0);
  });

  it("validates the customer ID", async () => {
    const response = await runController(createDeletionRequest, {
      user: users.user,
      body: {
        companyId: ids.company,
        requestType: "data_deletion",
        description: "Please delete my data.",
      },
    });

    assert.equal(response.nextError.statusCode, 400);
    assert.match(response.nextError.message, /customerId/i);
  });

  it("validates the request type", async () => {
    const response = await runController(createDeletionRequest, {
      user: users.user,
      body: {
        ...requestPayload,
        requestType: "unsupported",
      },
    });

    assert.equal(response.nextError.statusCode, 400);
    assert.match(response.nextError.message, /requestType/i);
  });
});
