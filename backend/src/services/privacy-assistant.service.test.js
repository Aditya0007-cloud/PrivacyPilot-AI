import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  answerPrivacyPolicyQuestion,
  resetPrivacyAssistantGeminiModelFactoryForTests,
  setPrivacyAssistantGeminiModelFactoryForTests,
} from "./privacy-assistant.service.js";

const validResponse = {
  answer: "The policy says your email is collected to manage your account.",
  confidence: "High",
  source: "Information We Collect section",
  notFound: false,
};

afterEach(() => {
  resetPrivacyAssistantGeminiModelFactoryForTests();
});

describe("privacy assistant service", () => {
  it("parses valid Gemini JSON", async () => {
    setPrivacyAssistantGeminiModelFactoryForTests(() => ({
      generateContent: async () => ({
        response: {
          text: () => JSON.stringify(validResponse),
        },
      }),
    }));

    const response = await answerPrivacyPolicyQuestion({
      policyText: "Information We Collect section: email is collected.",
      question: "Why is my email address collected?",
    });

    assert.equal(response.confidence, "High");
    assert.equal(response.notFound, false);
  });

  it("rejects invalid Gemini JSON", async () => {
    setPrivacyAssistantGeminiModelFactoryForTests(() => ({
      generateContent: async () => ({
        response: {
          text: () => "not json",
        },
      }),
    }));

    await assert.rejects(
      () =>
        answerPrivacyPolicyQuestion({
          policyText: "Policy text",
          question: "Question",
        }),
      /returned invalid JSON/,
    );
  });

  it("rejects Gemini JSON with an unexpected shape", async () => {
    setPrivacyAssistantGeminiModelFactoryForTests(() => ({
      generateContent: async () => ({
        response: {
          text: () => JSON.stringify({ answer: "Incomplete" }),
        },
      }),
    }));

    await assert.rejects(
      () =>
        answerPrivacyPolicyQuestion({
          policyText: "Policy text",
          question: "Question",
        }),
      /unexpected format/,
    );
  });
});
