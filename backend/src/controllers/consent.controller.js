import mongoose from "mongoose";

import { AuditLog } from "../models/AuditLog.js";
import { Consent } from "../models/Consent.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/async-handler.js";
import { withMongoRetry } from "../utils/mongo-retry.js";

const CONSENT_ACTIONS = {
  granted: "CONSENT_GRANTED",
  withdrawn: "CONSENT_WITHDRAWN",
};

const serializeConsent = (consent) => ({
  id: consent._id.toString(),
  userId: consent.userId.toString(),
  companyId: consent.companyId.toString(),
  purpose: consent.purpose,
  dataCategory: consent.dataCategory,
  description: consent.description,
  status: consent.status,
  grantedAt: consent.grantedAt,
  withdrawnAt: consent.withdrawnAt,
  createdAt: consent.createdAt,
  updatedAt: consent.updatedAt,
});

const createAuditLog = async ({ consent, action, actorId, metadata = {} }) => {
  await withMongoRetry(() => AuditLog.create({
    userId: consent.userId,
    companyId: consent.companyId,
    action,
    resourceType: "Consent",
    resourceId: consent._id,
    metadata: {
      ...metadata,
      actorId: actorId.toString(),
      actorType: metadata.actorType || (actorId.toString() === consent.companyId.toString() ? "COMPANY" : "USER"),
      status: consent.status,
    },
    timestamp: new Date(),
  }));
};

const requireObjectId = (value, label) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    const error = new Error(`${label} is invalid`);
    error.statusCode = 400;
    throw error;
  }
};

const normalizeRequiredText = (value, label, maxLength) => {
  const normalizedValue = typeof value === "string" ? value.trim() : "";

  if (!normalizedValue) {
    const error = new Error(`${label} is required`);
    error.statusCode = 400;
    throw error;
  }

  if (normalizedValue.length > maxLength) {
    const error = new Error(`${label} must be ${maxLength} characters or fewer`);
    error.statusCode = 400;
    throw error;
  }

  return normalizedValue;
};

export const createConsent = asyncHandler(async (req, res) => {
  const { userId, companyId, purpose, dataCategory, description } = req.body;

  let normalizedPurpose;
  let normalizedDataCategory;
  let normalizedDescription;

  try {
    normalizedPurpose = normalizeRequiredText(purpose, "Purpose", 140);
    normalizedDataCategory = normalizeRequiredText(dataCategory, "Data category", 140);
    normalizedDescription = normalizeRequiredText(description, "Description", 1000);
  } catch (validationError) {
    return res.status(validationError.statusCode || 400).json({
      message: validationError.message,
    });
  }

  let resolvedUserId = userId;
  let resolvedCompanyId = companyId;

  if (req.user.role === "company") {
    if (!userId) {
      return res.status(400).json({ message: "userId is required for company-created consent" });
    }

    requireObjectId(userId, "userId");
    const targetUser = await withMongoRetry(() => User.findById(userId));

    if (!targetUser || targetUser.role !== "user") {
      return res.status(404).json({ message: "User account not found" });
    }

    resolvedUserId = targetUser._id;
    resolvedCompanyId = req.user._id;
  } else {
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    requireObjectId(companyId, "companyId");
    const targetCompany = await withMongoRetry(() => User.findById(companyId));

    if (!targetCompany || targetCompany.role !== "company") {
      return res.status(404).json({ message: "Company account not found" });
    }

    resolvedUserId = req.user._id;
    resolvedCompanyId = targetCompany._id;
  }

  const activeConsent = await withMongoRetry(() =>
    Consent.findOne({
      userId: resolvedUserId,
      companyId: resolvedCompanyId,
      purpose: normalizedPurpose,
      dataCategory: normalizedDataCategory,
      status: "granted",
    }),
  );

  if (activeConsent) {
    return res.status(409).json({
      message: "Active consent already exists for this purpose and data category",
    });
  }

  const consent = await withMongoRetry(() => Consent.create({
    userId: resolvedUserId,
    companyId: resolvedCompanyId,
    purpose: normalizedPurpose,
    dataCategory: normalizedDataCategory,
    description: normalizedDescription,
    status: "granted",
    grantedAt: new Date(),
  }));

  await createAuditLog({
    consent,
    action: CONSENT_ACTIONS.granted,
    actorId: req.user._id,
    metadata: {
      purpose: consent.purpose,
      dataCategory: consent.dataCategory,
    },
  });

  return res.status(201).json({ consent: serializeConsent(consent) });
});

export const getConsents = asyncHandler(async (req, res) => {
  const query =
    req.user.role === "company" ? { companyId: req.user._id } : { userId: req.user._id };

  const consents = await withMongoRetry(() => Consent.find(query).sort({ createdAt: -1 }));

  return res.json({
    consents: consents.map(serializeConsent),
  });
});

export const withdrawConsent = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, "Consent id");

  const consent = await withMongoRetry(() => Consent.findById(req.params.id));

  if (!consent) {
    return res.status(404).json({ message: "Consent record not found" });
  }

  if (req.user.role !== "user" || consent.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "You are not allowed to withdraw this consent" });
  }

  if (consent.status === "withdrawn") {
    return res.status(409).json({ message: "Consent has already been withdrawn" });
  }

  consent.status = "withdrawn";
  consent.withdrawnAt = new Date();
  await withMongoRetry(() => consent.save());

  await createAuditLog({
    consent,
    action: CONSENT_ACTIONS.withdrawn,
    actorId: req.user._id,
    metadata: {
      purpose: consent.purpose,
      dataCategory: consent.dataCategory,
    },
  });

  return res.json({ consent: serializeConsent(consent) });
});

export const getConsentOverview = asyncHandler(async (req, res) => {
  const consents = await withMongoRetry(() =>
    Consent.find({ companyId: req.user._id }).sort({ updatedAt: -1 }),
  );
  const total = consents.length;
  const granted = consents.filter((consent) => consent.status === "granted").length;
  const withdrawn = consents.filter((consent) => consent.status === "withdrawn").length;
  const recentActivity = consents.slice(0, 5).map(serializeConsent);

  return res.json({
    overview: {
      total,
      granted,
      withdrawn,
      recentActivity,
    },
  });
});
