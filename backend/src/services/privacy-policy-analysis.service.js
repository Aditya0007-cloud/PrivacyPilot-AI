import { z } from "zod";

import { generateAiText, getAiProviderName } from "../config/ai-provider.js";

export const analysisSchema = z.object({
  complianceScore: z.number().min(0).max(100),
  riskLevel: z.enum(["Low", "Medium", "High"]),
  summary: z.string().min(1),
  dataConsentCoverage: z.array(
    z.object({
      dataCategory: z.string().min(1),
      detected: z.boolean(),
      consentStatus: z.string().min(1),
      evidence: z.string().min(1),
    }),
  ),
  personalDataCollected: z.array(z.string()),
  processingPurposes: z.array(z.string()),
  thirdParties: z.array(z.string()),
  retentionInformation: z.array(z.string()),
  consentMechanism: z.string().min(1),
  userRights: z.array(z.string()),
  grievanceMechanism: z.string().min(1),
  complianceGaps: z.array(z.string()),
  recommendations: z.array(z.string()),
});

const MAX_POLICY_CHARS = 12000;

let aiTextGenerator = generateAiText;

export const setGeminiModelFactoryForTests = (factory) => {
  aiTextGenerator = async (prompt) => {
    const model = factory();
    const result = await model.generateContent(prompt);
    return result.response.text();
  };
};

export const resetGeminiModelFactoryForTests = () => {
  aiTextGenerator = generateAiText;
};

const buildPrompt = (policyText) => `
You are PrivacyPilot AI, an AI-assisted DPDP readiness assessment assistant.

Analyze only the supplied privacy policy text below.
Do not invent information.
If something is not mentioned, explicitly say it is not found.
Treat the result as an AI-assisted readiness assessment, NOT legal advice or legal certification.
Base the assessment on relevant DPDP concepts, including notice, consent, purpose limitation, data principal rights, grievance redressal, retention, sharing with third parties, and reasonable safeguards.
Return valid JSON only. Do not include markdown, code fences, comments, or extra prose.

The JSON must exactly match this shape:
{
  "complianceScore": number,
  "riskLevel": "Low" | "Medium" | "High",
  "summary": string,
  "dataConsentCoverage": [
    {
      "dataCategory": string,
      "detected": boolean,
      "consentStatus": string,
      "evidence": string
    }
  ],
  "personalDataCollected": [],
  "processingPurposes": [],
  "thirdParties": [],
  "retentionInformation": [],
  "consentMechanism": string,
  "userRights": [],
  "grievanceMechanism": string,
  "complianceGaps": [],
  "recommendations": []
}

Privacy policy text:
"""${policyText.slice(0, MAX_POLICY_CHARS)}"""
`;

const findMentions = (text, checks) =>
  checks
    .filter((check) => check.patterns.some((pattern) => pattern.test(text)))
    .map((check) => check.label);

const DATA_CONSENT_CHECKS = [
  { label: "Name", patterns: [/\bname\b/] },
  { label: "Email address", patterns: [/\bemail\b/, /e-mail/] },
  { label: "Phone number", patterns: [/\bphone\b/, /\bmobile\b/, /\bcontact number\b/] },
  { label: "Location", patterns: [/\blocation\b/, /\baddress\b/, /\bgps\b/] },
  { label: "Device information", patterns: [/\bdevice\b/, /\bip address\b/, /\bbrowser\b/] },
  { label: "Usage or analytics data", patterns: [/\banalytics\b/, /\busage\b/, /\bcookies?\b/] },
];

const compactPolicyText = (policyText) => policyText.replace(/\s+/g, " ").trim();

const findEvidenceSentence = (policyText, patterns) => {
  const sentences = compactPolicyText(policyText).split(/[.!?]\s+/);
  const match = sentences.find((sentence) =>
    patterns.some((pattern) => pattern.test(sentence.toLowerCase())),
  );

  if (!match) {
    return "Not found in the uploaded policy.";
  }

  return match.length > 180 ? `${match.slice(0, 177)}...` : match;
};

const buildDataConsentCoverage = (policyText) => {
  const text = policyText.toLowerCase();
  const hasConsent = /\bconsent\b|\bopt[- ]?in\b|\bagree\b|\bauthori[sz]e\b/.test(text);
  const hasWithdrawal = /\bwithdraw\b|\bwithdrawal\b|\bopt[- ]?out\b/.test(text);

  return DATA_CONSENT_CHECKS.map((check) => {
    const detected = check.patterns.some((pattern) => pattern.test(text));
    let consentStatus = "Not collected or not clearly mentioned.";

    if (detected && hasConsent && hasWithdrawal) {
      consentStatus = "Mentioned with consent and withdrawal language.";
    } else if (detected && hasConsent) {
      consentStatus = "Mentioned with consent language; withdrawal is not clearly found.";
    } else if (detected) {
      consentStatus = "Mentioned as collected, but consent language is not clearly found.";
    }

    return {
      dataCategory: check.label,
      detected,
      consentStatus,
      evidence: detected ? findEvidenceSentence(policyText, check.patterns) : "Not found in the uploaded policy.",
    };
  });
};

const buildDynamicSummary = ({
  complianceGaps,
  hasConsent,
  hasGrievance,
  personalDataCollected,
  processingPurposes,
  thirdParties,
  userRights,
}) => {
  const dataCount = personalDataCollected.length;
  const purposeCount = processingPurposes.length;
  const sharingText =
    thirdParties.length > 0
      ? `It also mentions ${thirdParties.length} third-party or vendor sharing category.`
      : "Third-party sharing is not clearly found.";
  const rightsText =
    userRights.length > 0
      ? `Data principal rights found: ${userRights.slice(0, 3).join(", ")}.`
      : "Data principal rights are not clearly found.";

  return `This policy mentions ${dataCount} personal data categor${dataCount === 1 ? "y" : "ies"} and ${purposeCount} processing purpose${purposeCount === 1 ? "" : "s"}. Consent language is ${hasConsent ? "present" : "not clearly found"}, and the grievance mechanism is ${hasGrievance ? "mentioned" : "not clearly found"}. ${sharingText} ${rightsText} ${complianceGaps.length} DPDP readiness gap${complianceGaps.length === 1 ? "" : "s"} were flagged from the uploaded text.`;
};

const fallbackAnalysisFromPolicyText = (policyText) => {
  const text = policyText.toLowerCase();
  const personalDataCollected = findMentions(text, DATA_CONSENT_CHECKS);
  const processingPurposes = findMentions(text, [
    { label: "Account or service delivery", patterns: [/\baccount\b/, /\bservice\b/, /\bdeliver/] },
    { label: "Customer support", patterns: [/\bsupport\b/, /\bgrievance\b/] },
    { label: "Marketing communications", patterns: [/\bmarketing\b/, /\bpromotional\b/] },
    { label: "Personalization", patterns: [/\bpersonalized\b/, /\brecommendation\b/] },
    { label: "Analytics and product improvement", patterns: [/\banalytics\b/, /\bimprove/] },
    { label: "Fraud prevention or security", patterns: [/\bfraud\b/, /\bsecurity\b/, /\bsafeguard/] },
  ]);
  const thirdParties = findMentions(text, [
    { label: "Payment processors", patterns: [/\bpayment processor/] },
    { label: "Delivery or service partners", patterns: [/\bdelivery\b/, /\bservice partner/] },
    { label: "Cloud hosting providers", patterns: [/\bcloud\b/, /\bhosting\b/] },
    { label: "Analytics vendors", patterns: [/\banalytics vendor/, /\banalytics\b/] },
    { label: "Third-party service providers", patterns: [/\bthird[- ]party\b/, /\bvendors?\b/] },
  ]);
  const retentionInformation = findMentions(text, [
    { label: "Retention period or criteria mentioned", patterns: [/\bretain/, /\bretention\b/, /\bdeleted?\b/, /\byears?\b/, /\bmonths?\b/] },
  ]);
  const userRights = findMentions(text, [
    { label: "Access", patterns: [/\baccess\b/] },
    { label: "Correction", patterns: [/\bcorrection\b/, /\bcorrect\b/] },
    { label: "Consent withdrawal", patterns: [/\bwithdraw\b/, /\bwithdrawal\b/] },
    { label: "Deletion request", patterns: [/\bdeletion\b/, /\berasure\b/, /\bdelete\b/] },
    { label: "Grievance redressal", patterns: [/\bgrievance\b/, /\bofficer\b/] },
  ]);
  const hasConsent = /\bconsent\b|\bwithdraw/.test(text);
  const hasGrievance = /\bgrievance\b|\bofficer\b|\bcomplaint\b/.test(text);
  const complianceGaps = [];

  if (personalDataCollected.length === 0) complianceGaps.push("Personal data categories are not clearly listed.");
  if (processingPurposes.length === 0) complianceGaps.push("Processing purposes are not clearly described.");
  if (thirdParties.length === 0) complianceGaps.push("Third-party sharing information is not found or unclear.");
  if (retentionInformation.length === 0) complianceGaps.push("Retention information is missing or unclear.");
  if (!hasConsent) complianceGaps.push("Consent mechanism or withdrawal process is not clearly described.");
  if (userRights.length === 0) complianceGaps.push("Data principal rights are not clearly described.");
  if (!hasGrievance) complianceGaps.push("Grievance mechanism is missing or unclear.");

  const score = Math.max(45, Math.min(92, 92 - complianceGaps.length * 7));

  return {
    complianceScore: score,
    riskLevel: score >= 80 ? "Low" : score >= 60 ? "Medium" : "High",
    summary: buildDynamicSummary({
      complianceGaps,
      hasConsent,
      hasGrievance,
      personalDataCollected,
      processingPurposes,
      thirdParties,
      userRights,
    }),
    dataConsentCoverage: buildDataConsentCoverage(policyText),
    personalDataCollected: personalDataCollected.length ? personalDataCollected : ["Not found"],
    processingPurposes: processingPurposes.length ? processingPurposes : ["Not found"],
    thirdParties: thirdParties.length ? thirdParties : ["Not found"],
    retentionInformation: retentionInformation.length ? retentionInformation : ["Not found"],
    consentMechanism: hasConsent ? "Consent or withdrawal is mentioned in the policy." : "Not found",
    userRights: userRights.length ? userRights : ["Not found"],
    grievanceMechanism: hasGrievance ? "A grievance or complaint mechanism is mentioned." : "Not found",
    complianceGaps: complianceGaps.length ? complianceGaps : ["No major gaps detected by the fallback text assessment."],
    recommendations: [
      "Use a clear DPDP notice table mapping data category, purpose, consent basis, retention, and sharing.",
      "Describe consent withdrawal and data principal request handling timelines.",
      "Clarify third-party sharing, safeguards, and retention periods where applicable.",
      "Document grievance contact details and resolution workflow clearly.",
    ],
  };
};

export const enrichPolicyAnalysisForDisplay = (analysis, policyText) => {
  const fallbackAnalysis = fallbackAnalysisFromPolicyText(policyText);
  const hasGenericFallbackSummary =
    typeof analysis.summary === "string" &&
    analysis.summary.startsWith("OpenRouter did not return a reliable structured response");

  return {
    ...analysis,
    dataConsentCoverage: fallbackAnalysis.dataConsentCoverage,
    summary: hasGenericFallbackSummary ? fallbackAnalysis.summary : analysis.summary,
  };
};

const stripJsonFences = (content) =>
  content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const extractJsonObject = (content) => {
  const strippedContent = stripJsonFences(content);
  const start = strippedContent.indexOf("{");
  const end = strippedContent.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return strippedContent;
  }

  return strippedContent.slice(start, end + 1);
};

const parseAiJson = (content) => {
  try {
    return JSON.parse(extractJsonObject(content));
  } catch {
    const error = new Error(`${getAiProviderName()} returned invalid JSON`);
    error.statusCode = 502;
    throw error;
  }
};

const normalizeString = (value) => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return "Not found";
};

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return ["Not found"];
  }

  const normalizedItems = value
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => item.trim());

  return normalizedItems.length > 0 ? normalizedItems : ["Not found"];
};

const normalizeComplianceScore = (value) => {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.min(Math.max(Math.round(score), 0), 100);
};

const normalizeRiskLevel = (value) => {
  if (["Low", "Medium", "High"].includes(value)) {
    return value;
  }

  const normalizedValue = typeof value === "string" ? value.toLowerCase() : "";

  if (normalizedValue.includes("high")) return "High";
  if (normalizedValue.includes("low")) return "Low";
  return "Medium";
};

const requiredAnalysisKeys = [
  "complianceScore",
  "riskLevel",
  "summary",
  "personalDataCollected",
  "processingPurposes",
  "thirdParties",
  "retentionInformation",
  "consentMechanism",
  "userRights",
  "grievanceMechanism",
  "complianceGaps",
  "recommendations",
];

const normalizeAnalysis = (analysis) => ({
  ...analysis,
  complianceScore: normalizeComplianceScore(analysis.complianceScore),
  complianceGaps: normalizeStringArray(analysis.complianceGaps),
  consentMechanism: normalizeString(analysis.consentMechanism),
  grievanceMechanism: normalizeString(analysis.grievanceMechanism),
  personalDataCollected: normalizeStringArray(analysis.personalDataCollected),
  processingPurposes: normalizeStringArray(analysis.processingPurposes),
  recommendations: normalizeStringArray(analysis.recommendations),
  retentionInformation: normalizeStringArray(analysis.retentionInformation),
  riskLevel: normalizeRiskLevel(analysis.riskLevel),
  summary: normalizeString(analysis.summary),
  thirdParties: normalizeStringArray(analysis.thirdParties),
  userRights: normalizeStringArray(analysis.userRights),
});

const enrichAnalysis = (analysis, policyText) => ({
  ...analysis,
  dataConsentCoverage: buildDataConsentCoverage(policyText),
});

export const analyzePolicyText = async (policyText, { allowAiJsonFallback = false } = {}) => {
  try {
    const responseText = await aiTextGenerator(buildPrompt(policyText), { preferFast: true });
    const parsedAnalysis = parseAiJson(responseText);

    if (!requiredAnalysisKeys.every((key) => Object.hasOwn(parsedAnalysis, key))) {
      const error = new Error(`${getAiProviderName()} returned JSON in an unexpected format`);
      error.statusCode = 502;
      throw error;
    }

    const normalizedAnalysis = enrichAnalysis(normalizeAnalysis(parsedAnalysis), policyText);
    const validatedAnalysis = analysisSchema.safeParse(normalizedAnalysis);

    if (!validatedAnalysis.success) {
      const error = new Error(`${getAiProviderName()} returned JSON in an unexpected format`);
      error.statusCode = 502;
      throw error;
    }

    return validatedAnalysis.data;
  } catch (error) {
    if (error.statusCode && !allowAiJsonFallback) {
      throw error;
    }

    return fallbackAnalysisFromPolicyText(policyText);
  }
};
