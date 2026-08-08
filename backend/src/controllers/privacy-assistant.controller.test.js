import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { PrivacyPolicy } from "../models/PrivacyPolicy.js";
import { runController } from "../test-utils/controller.js";
import {
  chatWithPrivacyAssistant,
  privacyAssistantControllerDependencies,
} from "./privacy-assistant.controller.js";

const originalMethods = {
  privacyPolicyFindOne: PrivacyPolicy.findOne,
  answerPrivacyPolicyQuestion:
    privacyAssistantControllerDependencies.answerPrivacyPolicyQuestion,
};

const ids = {
  company: "64f200000000000000000001",
  noPolicyCompany: "64f200000000000000000002",
  user: "64f200000000000000000003",
};

const user = {
  _id: { toString: () => ids.user },
  name: "Data Principal",
  role: "user",
};

const assistantResponse = {
  answer: "The policy says phone numbers may be shared with service partners.",
  confidence: "High",
  source: "Data Sharing section",
  notFound: false,
};

beforeEach(() => {
  PrivacyPolicy.findOne = (query) => ({
    sort: async () => {
      if (query.companyId === ids.noPolicyCompany) {
        return null;
      }

      return {
        _id: { toString: () => "policy-1" },
        companyId: { toString: () => ids.company },
        extractedText:
          "Data Sharing section: phone numbers may be shared with service partners.",
        createdAt: new Date("2026-08-08T06:00:00.000Z"),
      };
    },
  });

  privacyAssistantControllerDependencies.answerPrivacyPolicyQuestion = async ({
    policyText,
    question,
  }) => ({
    ...assistantResponse,
    source: policyText.includes("Data Sharing") ? "Data Sharing section" : "Policy",
    answer: question.includes("phone")
      ? assistantResponse.answer
      : "I could not find this information in the uploaded privacy policy.",
    notFound: !question.includes("phone"),
    confidence: question.includes("phone") ? "High" : "Low",
  });
});

afterEach(() => {
  PrivacyPolicy.findOne = originalMethods.privacyPolicyFindOne;
  privacyAssistantControllerDependencies.answerPrivacyPolicyQuestion =
    originalMethods.answerPrivacyPolicyQuestion;
});

describe("privacy assistant controller", () => {
  it("allows an authenticated user to ask a grounded question", async () => {
    const response = await runController(chatWithPrivacyAssistant, {
      user,
      body: {
        companyId: ids.company,
        question: "Can this company share my phone number?",
      },
    });

    assert.equal(response.res.statusCode, 200);
    assert.equal(response.res.body.response.confidence, "High");
    assert.equal(response.res.body.response.source, "Data Sharing section");
    assert.equal(response.res.body.response.notFound, false);
  });

  it("rejects empty questions", async () => {
    const response = await runController(chatWithPrivacyAssistant, {
      user,
      body: {
        companyId: ids.company,
        question: "   ",
      },
    });

    assert.equal(response.res.statusCode, 400);
  });

  it("rejects missing companyId", async () => {
    const response = await runController(chatWithPrivacyAssistant, {
      user,
      body: {
        question: "Does this company collect my phone number?",
      },
    });

    assert.equal(response.res.statusCode, 400);
  });

  it("rejects invalid companyId", async () => {
    const response = await runController(chatWithPrivacyAssistant, {
      user,
      body: {
        companyId: "not-valid",
        question: "Does this company collect my phone number?",
      },
    });

    assert.equal(response.nextError.statusCode, 400);
  });

  it("handles no policy available", async () => {
    const response = await runController(chatWithPrivacyAssistant, {
      user,
      body: {
        companyId: ids.noPolicyCompany,
        question: "Does this company collect my phone number?",
      },
    });

    assert.equal(response.res.statusCode, 404);
  });

  it("handles Gemini failure", async () => {
    const error = new Error("Gemini unavailable");
    error.statusCode = 502;
    privacyAssistantControllerDependencies.answerPrivacyPolicyQuestion = async () => {
      throw error;
    };

    const response = await runController(chatWithPrivacyAssistant, {
      user,
      body: {
        companyId: ids.company,
        question: "Does this company collect my phone number?",
      },
    });

    assert.equal(response.nextError.statusCode, 502);
    assert.equal(response.nextError.message, "Gemini unavailable");
  });

  it("returns a not-found answer instead of fabricated fallback information", async () => {
    const response = await runController(chatWithPrivacyAssistant, {
      user,
      body: {
        companyId: ids.company,
        question: "Does the policy mention biometric data?",
      },
    });

    assert.equal(response.res.statusCode, 200);
    assert.equal(response.res.body.response.notFound, true);
    assert.match(response.res.body.response.answer, /could not find this information/i);
  });
});
