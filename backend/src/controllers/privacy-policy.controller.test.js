import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { afterEach, beforeEach, describe, it } from "node:test";

import { authorizeRoles, requireAuth } from "../middleware/auth.js";
import { validatePrivacyPolicyPdfFile } from "../middleware/upload.js";
import { AuditLog } from "../models/AuditLog.js";
import { User } from "../models/User.js";
import { PrivacyPolicy } from "../models/PrivacyPolicy.js";
import { runController } from "../test-utils/controller.js";
import {
  analyzePrivacyPolicy,
  getLatestPrivacyPolicy,
  privacyPolicyControllerDependencies,
} from "./privacy-policy.controller.js";

const originalMethods = {
  userFindById: User.findById,
  auditLogCreate: AuditLog.create,
  privacyPolicyCreate: PrivacyPolicy.create,
  privacyPolicyFindOne: PrivacyPolicy.findOne,
  extractPdfText: privacyPolicyControllerDependencies.extractPdfText,
  analyzePolicyText: privacyPolicyControllerDependencies.analyzePolicyText,
};

let auditLogs;

const users = {
  company: {
    _id: { toString: () => "company-1" },
    name: "Asha Company",
    email: "company@example.com",
    role: "company",
    createdAt: new Date("2026-08-08T00:00:00.000Z"),
  },
  user: {
    _id: { toString: () => "user-1" },
    name: "Data Principal",
    email: "user@example.com",
    role: "user",
    createdAt: new Date("2026-08-08T00:00:00.000Z"),
  },
};

const analysis = {
  complianceScore: 84,
  riskLevel: "Medium",
  summary: "The policy covers core DPDP concepts but has gaps.",
  personalDataCollected: ["Email", "Phone number", "Name"],
  processingPurposes: ["Account management"],
  thirdParties: ["Payment processor"],
  retentionInformation: ["Not found"],
  consentMechanism: "Consent is mentioned, withdrawal is not found.",
  userRights: ["Access", "Correction"],
  grievanceMechanism: "Not found",
  complianceGaps: ["Missing retention period", "Grievance mechanism incomplete"],
  recommendations: ["Add retention periods", "Add grievance officer details"],
};

const pdfFile = {
  originalname: "privacy-policy.pdf",
  mimetype: "application/pdf",
  buffer: Buffer.from("%PDF privacy policy"),
};

beforeEach(() => {
  auditLogs = [];
  User.findById = async (id) => {
    if (id === "company-1") return users.company;
    if (id === "user-1") return users.user;
    return null;
  };

  PrivacyPolicy.create = async (payload) => ({
    _id: { toString: () => "policy-1" },
    ...payload,
    createdAt: new Date("2026-08-08T01:00:00.000Z"),
    updatedAt: new Date("2026-08-08T01:00:00.000Z"),
  });

  PrivacyPolicy.findOne = () => ({
    sort: async () => ({
      _id: { toString: () => "policy-1" },
      companyId: { toString: () => "company-1" },
      originalFileName: "privacy-policy.pdf",
      extractedText: "We collect email for account management.",
      analysis,
      complianceScore: analysis.complianceScore,
      riskLevel: analysis.riskLevel,
      createdAt: new Date("2026-08-08T01:00:00.000Z"),
      updatedAt: new Date("2026-08-08T01:00:00.000Z"),
    }),
  });

  privacyPolicyControllerDependencies.extractPdfText = async () =>
    "We collect email for account management.";
  privacyPolicyControllerDependencies.analyzePolicyText = async () => analysis;
  AuditLog.create = async (payload) => {
    auditLogs.push(payload);
    return payload;
  };
});

afterEach(() => {
  User.findById = originalMethods.userFindById;
  AuditLog.create = originalMethods.auditLogCreate;
  PrivacyPolicy.create = originalMethods.privacyPolicyCreate;
  PrivacyPolicy.findOne = originalMethods.privacyPolicyFindOne;
  privacyPolicyControllerDependencies.extractPdfText = originalMethods.extractPdfText;
  privacyPolicyControllerDependencies.analyzePolicyText = originalMethods.analyzePolicyText;
});

describe("privacy policy controllers", () => {
  it("rejects unauthenticated requests", async () => {
    const response = await runController(requireAuth, {
      headers: {},
    });

    assert.equal(response.res.statusCode, 401);
  });

  it("rejects authenticated non-company users", async () => {
    const response = await runController(authorizeRoles("company"), {
      user: users.user,
    });

    assert.equal(response.res.statusCode, 403);
  });

  it("rejects missing files and non-PDF uploads", async () => {
    const missingFileResponse = await runController(analyzePrivacyPolicy, {
      user: users.company,
    });

    assert.equal(missingFileResponse.res.statusCode, 400);
    assert.equal(
      validatePrivacyPolicyPdfFile({
        originalname: "policy.txt",
        mimetype: "text/plain",
      }),
      false,
    );
  });

  it("rejects empty PDFs", async () => {
    privacyPolicyControllerDependencies.extractPdfText = async () => "";

    const response = await runController(analyzePrivacyPolicy, {
      user: users.company,
      file: pdfFile,
    });

    assert.equal(response.res.statusCode, 400);
    assert.match(response.res.body.message, /does not contain extractable text/i);
  });

  it("analyzes a PDF and returns the saved structured result", async () => {
    const response = await runController(analyzePrivacyPolicy, {
      user: users.company,
      file: pdfFile,
    });

    assert.equal(response.res.statusCode, 201);
    assert.equal(response.res.body.privacyPolicy.originalFileName, "privacy-policy.pdf");
    assert.equal(response.res.body.privacyPolicy.complianceScore, 84);
    assert.equal(response.res.body.privacyPolicy.riskLevel, "Medium");
    assert.deepEqual(response.res.body.privacyPolicy.analysis.complianceGaps, [
      "Missing retention period",
      "Grievance mechanism incomplete",
    ]);
    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].action, "POLICY_ANALYZED");
    assert.equal(auditLogs[0].metadata.complianceScore, 84);
  });

  it("returns the company's latest analysis", async () => {
    const response = await runController(getLatestPrivacyPolicy, {
      user: users.company,
    });

    assert.equal(response.res.statusCode, 200);
    assert.equal(response.res.body.privacyPolicy.complianceScore, 84);
  });

  it("handles Gemini API failures", async () => {
    const error = new Error("Gemini unavailable");
    error.statusCode = 502;
    privacyPolicyControllerDependencies.analyzePolicyText = async () => {
      throw error;
    };

    const response = await runController(analyzePrivacyPolicy, {
      user: users.company,
      file: pdfFile,
    });

    assert.equal(response.nextError.statusCode, 502);
    assert.equal(response.nextError.message, "Gemini unavailable");
  });
});
