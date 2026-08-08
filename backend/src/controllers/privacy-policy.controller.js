import { AuditLog } from "../models/AuditLog.js";
import { PrivacyPolicy } from "../models/PrivacyPolicy.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  analyzePolicyText,
  enrichPolicyAnalysisForDisplay,
} from "../services/privacy-policy-analysis.service.js";
import { extractPdfText } from "../services/pdf.service.js";
import { withMongoRetry } from "../utils/mongo-retry.js";

export const privacyPolicyControllerDependencies = {
  analyzePolicyText,
  extractPdfText,
};

const serializePrivacyPolicy = (policy) => ({
  id: policy._id.toString(),
  companyId: policy.companyId.toString(),
  originalFileName: policy.originalFileName,
  extractedText: policy.extractedText,
  analysis: enrichPolicyAnalysisForDisplay(policy.analysis, policy.extractedText),
  complianceScore: policy.complianceScore,
  riskLevel: policy.riskLevel,
  createdAt: policy.createdAt,
  updatedAt: policy.updatedAt,
});

export const analyzePrivacyPolicy = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Privacy policy PDF is required" });
  }

  let extractedText;

  try {
    extractedText = await privacyPolicyControllerDependencies.extractPdfText(req.file.buffer);
  } catch (error) {
    error.statusCode = 400;
    error.message = "Unable to extract text from the uploaded PDF";
    throw error;
  }

  if (!extractedText) {
    return res.status(400).json({ message: "Uploaded PDF does not contain extractable text" });
  }

  const analysis = await privacyPolicyControllerDependencies.analyzePolicyText(extractedText, {
    allowAiJsonFallback: true,
  });

  const privacyPolicy = await PrivacyPolicy.create({
    companyId: req.user._id,
    originalFileName: req.file.originalname,
    extractedText,
    analysis,
    complianceScore: analysis.complianceScore,
    riskLevel: analysis.riskLevel,
  });

  await AuditLog.create({
    userId: req.user._id,
    companyId: req.user._id,
    action: "POLICY_ANALYZED",
    resourceType: "PrivacyPolicy",
    resourceId: privacyPolicy._id,
    metadata: {
      actorId: req.user._id.toString(),
      actorType: "COMPANY",
      originalFileName: privacyPolicy.originalFileName,
      complianceScore: privacyPolicy.complianceScore,
      riskLevel: privacyPolicy.riskLevel,
      gaps: privacyPolicy.analysis?.complianceGaps?.length || 0,
    },
    timestamp: new Date(),
  });

  return res.status(201).json({
    privacyPolicy: serializePrivacyPolicy(privacyPolicy),
  });
});

export const getLatestPrivacyPolicy = asyncHandler(async (req, res) => {
  const privacyPolicy = await withMongoRetry(() =>
    PrivacyPolicy.findOne({ companyId: req.user._id }).sort({
      createdAt: -1,
    }),
  );

  if (!privacyPolicy) {
    return res.json({ privacyPolicy: null });
  }

  return res.json({
    privacyPolicy: serializePrivacyPolicy(privacyPolicy),
  });
});
