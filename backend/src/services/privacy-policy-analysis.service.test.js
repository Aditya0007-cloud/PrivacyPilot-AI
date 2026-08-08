import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  analyzePolicyText,
  resetGeminiModelFactoryForTests,
  setGeminiModelFactoryForTests,
} from "./privacy-policy-analysis.service.js";

const validAnalysis = {
  complianceScore: 84,
  riskLevel: "Medium",
  summary: "The policy has useful disclosures and some gaps.",
  personalDataCollected: ["Email"],
  processingPurposes: ["Account management"],
  thirdParties: ["Not found"],
  retentionInformation: ["Not found"],
  consentMechanism: "Consent collection is mentioned.",
  userRights: ["Access"],
  grievanceMechanism: "Not found",
  complianceGaps: ["Retention information is missing"],
  recommendations: ["Add retention periods"],
};

afterEach(() => {
  resetGeminiModelFactoryForTests();
});

describe("privacy policy analysis service", () => {
  it("parses valid Gemini JSON", async () => {
    setGeminiModelFactoryForTests(() => ({
      generateContent: async () => ({
        response: {
          text: () => JSON.stringify(validAnalysis),
        },
      }),
    }));

    const analysis = await analyzePolicyText("We collect email.");

    assert.equal(analysis.complianceScore, 84);
    assert.equal(analysis.riskLevel, "Medium");
  });

  it("rejects invalid Gemini JSON", async () => {
    setGeminiModelFactoryForTests(() => ({
      generateContent: async () => ({
        response: {
          text: () => "not json",
        },
      }),
    }));

    await assert.rejects(
      () => analyzePolicyText("We collect email."),
      /returned invalid JSON/,
    );
  });

  it("rejects Gemini JSON with an unexpected shape", async () => {
    setGeminiModelFactoryForTests(() => ({
      generateContent: async () => ({
        response: {
          text: () => JSON.stringify({ summary: "Incomplete" }),
        },
      }),
    }));

    await assert.rejects(
      () => analyzePolicyText("We collect email."),
      /unexpected format/,
    );
  });

  it("returns a conservative fallback assessment when the AI provider fails", async () => {
    setGeminiModelFactoryForTests(() => ({
      generateContent: async () => {
        throw new Error("Provider timeout");
      },
    }));

    const analysis = await analyzePolicyText(
      "We collect name, email, phone number, analytics data, and location. Users can withdraw consent and request deletion. Data is retained for seven years. A grievance officer is available.",
    );

    assert.equal(typeof analysis.complianceScore, "number");
    assert.ok(["Low", "Medium", "High"].includes(analysis.riskLevel));
    assert.ok(analysis.personalDataCollected.includes("Email address"));
    assert.ok(analysis.userRights.includes("Deletion request"));
    assert.ok(analysis.dataConsentCoverage.some((item) => item.dataCategory === "Phone number" && item.detected));
  });
});
