import { z } from "zod";

import { generateAiText, getAiProviderName } from "../config/ai-provider.js";

export const MAX_ASSISTANT_QUESTION_LENGTH = 500;

const MAX_POLICY_CHARS = 12000;

export const assistantResponseSchema = z.object({
  answer: z.string().min(1),
  confidence: z.enum(["High", "Medium", "Low"]),
  source: z.string().min(1),
  notFound: z.boolean(),
});

let aiTextGenerator = generateAiText;

export const setPrivacyAssistantGeminiModelFactoryForTests = (factory) => {
  aiTextGenerator = async (prompt) => {
    const model = factory();
    const result = await model.generateContent(prompt);
    return result.response.text();
  };
};

export const resetPrivacyAssistantGeminiModelFactoryForTests = () => {
  aiTextGenerator = generateAiText;
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

const parseAssistantJson = (content) => {
  try {
    return JSON.parse(extractJsonObject(content));
  } catch {
    const error = new Error(`${getAiProviderName()} returned invalid JSON`);
    error.statusCode = 502;
    throw error;
  }
};

const normalizeAssistantResponse = (response) => ({
  ...response,
  answer:
    typeof response.answer === "string" && response.answer.trim()
      ? response.answer.trim()
      : "I could not find this information in the uploaded privacy policy.",
  confidence: ["High", "Medium", "Low"].includes(response.confidence)
    ? response.confidence
    : "Low",
  notFound: Boolean(response.notFound),
  source:
    typeof response.source === "string" && response.source.trim()
      ? response.source.trim()
      : "Not found",
});

const requiredAssistantKeys = ["answer", "confidence", "source", "notFound"];

const buildPrompt = ({ policyText, question }) => `
You are a privacy policy assistant.

Answer the user's question ONLY using the supplied privacy policy.

Do not invent information.

If the answer cannot be found in the policy, clearly say:
"I could not find this information in the uploaded privacy policy."

Explain the answer in simple language.

When possible, mention the relevant policy section or wording.

Do not provide legal advice or claim legal compliance.

Return structured JSON only. Do not include markdown, code fences, comments, or extra prose.

The JSON must exactly match this shape:
{
  "answer": "...",
  "confidence": "High" | "Medium" | "Low",
  "source": "...",
  "notFound": false
}

Privacy policy:
"""${policyText.slice(0, MAX_POLICY_CHARS)}"""

User question:
"""${question}"""
`;

export const answerPrivacyPolicyQuestion = async ({ policyText, question }) => {
  try {
    const responseText = await aiTextGenerator(
      buildPrompt({ policyText, question }),
      { preferFast: true },
    );
    const parsedResponse = parseAssistantJson(responseText);

    if (!requiredAssistantKeys.every((key) => Object.hasOwn(parsedResponse, key))) {
      const error = new Error(`${getAiProviderName()} returned JSON in an unexpected format`);
      error.statusCode = 502;
      throw error;
    }

    const normalizedResponse = normalizeAssistantResponse(parsedResponse);
    const validatedResponse = assistantResponseSchema.safeParse(normalizedResponse);

    if (!validatedResponse.success) {
      const error = new Error(`${getAiProviderName()} returned JSON in an unexpected format`);
      error.statusCode = 502;
      throw error;
    }

    return validatedResponse.data;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    const aiError = new Error(`${getAiProviderName()} API failed to answer the privacy question`);
    aiError.statusCode = 502;
    aiError.cause = error;
    throw aiError;
  }
};
