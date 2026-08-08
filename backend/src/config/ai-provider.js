import { GoogleGenerativeAI } from "@google/generative-ai";

import { env } from "./env.js";

const getGeminiModel = () => {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
};

const generateWithGemini = async (prompt) => {
  const model = getGeminiModel();
  const result = await model.generateContent(prompt);
  return result.response.text();
};

const callOpenRouterModel = async ({ model, prompt }) => {
  const response = await globalThis.fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env.CLIENT_URL,
      "X-Title": "PrivacyPilot AI",
    },
    body: JSON.stringify({
      max_tokens: env.OPENROUTER_MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model,
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
    signal: globalThis.AbortSignal.timeout(env.OPENROUTER_TIMEOUT_MS),
  });

  if (!response.ok) {
    const error = new Error(`OpenRouter API failed with status ${response.status}`);
    error.statusCode = 502;
    throw error;
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    const error = new Error("OpenRouter returned an empty response");
    error.statusCode = 502;
    throw error;
  }

  return text;
};

const uniqueModels = (models) => [...new Set(models.filter(Boolean))];

const generateWithOpenRouter = async (prompt, { preferFast = false } = {}) => {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const models = uniqueModels(
    preferFast
      ? [env.OPENROUTER_FAST_MODEL, env.OPENROUTER_FALLBACK_MODEL]
      : [env.OPENROUTER_MODEL, env.OPENROUTER_FAST_MODEL, env.OPENROUTER_FALLBACK_MODEL],
  );
  let lastError;

  for (const model of models) {
    try {
      return await callOpenRouterModel({ model, prompt });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

export const getAiProviderName = () => {
  if (env.AI_PROVIDER === "openrouter" || env.OPENROUTER_API_KEY) {
    return "OpenRouter";
  }

  return "Gemini";
};

export const generateAiText = async (prompt, options = {}) => {
  if (getAiProviderName() === "OpenRouter") {
    return generateWithOpenRouter(prompt, options);
  }

  return generateWithGemini(prompt);
};
