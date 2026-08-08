import mongoose from "mongoose";

import { PrivacyPolicy } from "../models/PrivacyPolicy.js";
import {
  answerPrivacyPolicyQuestion,
  MAX_ASSISTANT_QUESTION_LENGTH,
} from "../services/privacy-assistant.service.js";
import { asyncHandler } from "../utils/async-handler.js";

export const privacyAssistantControllerDependencies = {
  answerPrivacyPolicyQuestion,
};

const requireObjectId = (value, label) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    const error = new Error(`${label} is invalid`);
    error.statusCode = 400;
    throw error;
  }
};

export const chatWithPrivacyAssistant = asyncHandler(async (req, res) => {
  const { companyId, question } = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  requireObjectId(companyId, "companyId");

  if (!question || !question.trim()) {
    return res.status(400).json({ message: "Question is required" });
  }

  if (question.trim().length > MAX_ASSISTANT_QUESTION_LENGTH) {
    return res.status(400).json({
      message: `Question must be ${MAX_ASSISTANT_QUESTION_LENGTH} characters or less`,
    });
  }

  const latestPolicy = await PrivacyPolicy.findOne({ companyId }).sort({ createdAt: -1 });

  if (!latestPolicy) {
    return res.status(404).json({ message: "No privacy policy is available for this company" });
  }

  const assistantResponse =
    await privacyAssistantControllerDependencies.answerPrivacyPolicyQuestion({
      policyText: latestPolicy.extractedText,
      question: question.trim(),
    });

  return res.json({
    response: assistantResponse,
  });
});
