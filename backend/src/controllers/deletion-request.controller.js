import mongoose from "mongoose";

import { AuditLog } from "../models/AuditLog.js";
import { DataDeletionRequest } from "../models/DataDeletionRequest.js";
import { asyncHandler } from "../utils/async-handler.js";
import { withMongoRetry } from "../utils/mongo-retry.js";

const ACTIVE_STATUSES = ["pending", "accepted", "in_progress"];
const VALID_REQUEST_TYPES = new Set([
  "data_deletion",
  "data_access",
  "data_correction",
  "processing_information",
]);

const STATUS_ACTIONS = {
  accepted: "DATA_RIGHTS_REQUEST_ACCEPTED",
  in_progress: "DATA_RIGHTS_REQUEST_PROCESSING_STARTED",
  completed: "DATA_RIGHTS_REQUEST_COMPLETED",
  rejected: "DATA_RIGHTS_REQUEST_REJECTED",
};

const STATUS_TRANSITIONS = {
  pending: ["accepted", "rejected"],
  accepted: ["in_progress", "rejected"],
  in_progress: ["completed", "rejected"],
  completed: [],
  rejected: [],
};

const serializeDeletionRequest = (request) => ({
  id: request._id.toString(),
  requestNumber: request.requestNumber || `REQ-${request._id.toString().slice(-6).toUpperCase()}`,
  userId: request.userId.toString(),
  companyId: request.companyId.toString(),
  customerId: request.customerId || "",
  requestType: request.requestType || "data_deletion",
  description: request.description || request.reason || "",
  reason: request.reason,
  status: request.status,
  requestedAt: request.requestedAt,
  reviewedAt: request.reviewedAt,
  acceptedAt: request.acceptedAt,
  rejectedAt: request.rejectedAt,
  processingStartedAt: request.processingStartedAt,
  completedAt: request.completedAt,
  processedAt: request.processedAt,
  processedBy: request.processedBy ? request.processedBy.toString() : null,
  rejectionReason: request.rejectionReason,
  completionNote: request.completionNote,
  companyResponse: request.companyResponse,
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
});

const requireObjectId = (value, label) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    const error = new Error(`${label} is invalid`);
    error.statusCode = 400;
    throw error;
  }
};

const createAuditLog = async ({ deletionRequest, action, actorId, metadata = {} }) => {
  await AuditLog.create({
    userId: deletionRequest.userId,
    companyId: deletionRequest.companyId,
    action,
    resourceType: "DataRightsRequest",
    resourceId: deletionRequest._id,
    metadata: {
      ...metadata,
      actorId: actorId.toString(),
      actorType: metadata.actorType || "COMPANY",
      customerId: deletionRequest.customerId || "",
      requestNumber: deletionRequest.requestNumber || "",
      requestType: deletionRequest.requestType || "data_deletion",
      status: deletionRequest.status,
    },
    timestamp: new Date(),
  });
};

const buildSummary = (requests) => ({
  pending: requests.filter((request) => request.status === "pending").length,
  accepted: requests.filter((request) => request.status === "accepted").length,
  inProgress: requests.filter((request) => request.status === "in_progress").length,
  completed: requests.filter((request) => request.status === "completed").length,
  rejected: requests.filter((request) => request.status === "rejected").length,
  active: requests.filter((request) => ACTIVE_STATUSES.includes(request.status)).length,
});

const requireCustomerId = (value) => {
  if (!value || !value.trim()) {
    const error = new Error("customerId is required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedValue = value.trim();

  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{2,49}$/.test(normalizedValue)) {
    const error = new Error("customerId must be 3-50 letters, numbers, hyphens, or underscores");
    error.statusCode = 400;
    throw error;
  }

  return normalizedValue.toUpperCase();
};

const normalizeRequestType = (requestType = "data_deletion") => {
  if (!VALID_REQUEST_TYPES.has(requestType)) {
    const error = new Error(
      "requestType must be data_deletion, data_access, data_correction, or processing_information",
    );
    error.statusCode = 400;
    throw error;
  }

  return requestType;
};

const createRequestNumber = () => `REQ-${Date.now().toString().slice(-6)}`;

export const createDeletionRequest = asyncHandler(async (req, res) => {
  const { companyId, customerId, requestType, description, reason } = req.body;

  if (req.user.role !== "user") {
    return res.status(403).json({ message: "Only data principals can create privacy requests" });
  }

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  requireObjectId(companyId, "companyId");
  const normalizedCustomerId = requireCustomerId(customerId);
  const normalizedRequestType = normalizeRequestType(requestType);
  const normalizedDescription = (description || reason || "").trim();

  if (normalizedDescription.length > 1000) {
    return res.status(400).json({ message: "Description must be 1000 characters or less" });
  }

  const existingActiveRequest = await DataDeletionRequest.findOne({
    userId: req.user._id,
    companyId,
    customerId: normalizedCustomerId,
    requestType: normalizedRequestType,
    status: { $in: ACTIVE_STATUSES },
  });

  if (existingActiveRequest) {
    return res
      .status(409)
      .json({ message: "An active privacy request already exists for this customer and type" });
  }

  const deletionRequest = await DataDeletionRequest.create({
    requestNumber: createRequestNumber(),
    userId: req.user._id,
    companyId,
    customerId: normalizedCustomerId,
    requestType: normalizedRequestType,
    description: normalizedDescription,
    reason: normalizedDescription,
    status: "pending",
    requestedAt: new Date(),
  });

  await createAuditLog({
    deletionRequest,
    action: "DATA_RIGHTS_REQUEST_SUBMITTED",
    actorId: req.user._id,
    metadata: {
      actorType: "USER",
    },
  });

  return res.status(201).json({
    deletionRequest: serializeDeletionRequest(deletionRequest),
    request: serializeDeletionRequest(deletionRequest),
  });
});

export const getDeletionRequests = asyncHandler(async (req, res) => {
  const query =
    req.user.role === "company" ? { companyId: req.user._id } : { userId: req.user._id };

  const deletionRequests = await withMongoRetry(() =>
    DataDeletionRequest.find(query).sort({ createdAt: -1 }),
  );

  return res.json({
    deletionRequests: deletionRequests.map(serializeDeletionRequest),
    requests: deletionRequests.map(serializeDeletionRequest),
    summary: buildSummary(deletionRequests),
  });
});

export const getDeletionRequestById = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, "Request id");

  const deletionRequest = await DataDeletionRequest.findById(req.params.id);

  if (!deletionRequest) {
    return res.status(404).json({ message: "Privacy request not found" });
  }

  const ownsRequest =
    req.user.role === "company"
      ? deletionRequest.companyId.toString() === req.user._id.toString()
      : deletionRequest.userId.toString() === req.user._id.toString();

  if (!ownsRequest) {
    return res.status(403).json({ message: "You are not allowed to access this request" });
  }

  return res.json({
    deletionRequest: serializeDeletionRequest(deletionRequest),
    request: serializeDeletionRequest(deletionRequest),
  });
});

export const updateDeletionRequestStatus = asyncHandler(async (req, res) => {
  const { status, rejectionReason, completionNote, companyResponse } = req.body;

  if (req.user.role !== "company") {
    return res.status(403).json({ message: "Only companies can update privacy request status" });
  }

  requireObjectId(req.params.id, "Deletion request id");

  if (!["accepted", "in_progress", "completed", "rejected"].includes(status)) {
    return res
      .status(400)
      .json({ message: "Status must be accepted, in_progress, completed, or rejected" });
  }

  if (status === "rejected" && (!rejectionReason || !rejectionReason.trim())) {
    return res.status(400).json({ message: "Rejection reason is required" });
  }

  const deletionRequest = await DataDeletionRequest.findById(req.params.id);

  if (!deletionRequest) {
    return res.status(404).json({ message: "Privacy request not found" });
  }

  if (deletionRequest.companyId.toString() !== req.user._id.toString()) {
    return res
      .status(403)
      .json({ message: "You are not allowed to update this privacy request" });
  }

  if (!STATUS_TRANSITIONS[deletionRequest.status]?.includes(status)) {
    return res.status(409).json({
      message: `Cannot move request from ${deletionRequest.status} to ${status}`,
    });
  }

  deletionRequest.status = status;
  deletionRequest.reviewedAt = deletionRequest.reviewedAt || new Date();
  deletionRequest.processedBy = req.user._id;

  if (companyResponse && companyResponse.trim()) {
    deletionRequest.companyResponse = companyResponse.trim();
  }

  if (status === "accepted") {
    deletionRequest.acceptedAt = new Date();
    deletionRequest.rejectionReason = "";
  }

  if (status === "in_progress") {
    deletionRequest.processingStartedAt = new Date();
  }

  if (status === "completed") {
    const completedAt = new Date();
    deletionRequest.completedAt = completedAt;
    deletionRequest.processedAt = completedAt;
    deletionRequest.rejectionReason = "";
    deletionRequest.completionNote = completionNote?.trim() || deletionRequest.completionNote || "";
    if (deletionRequest.completionNote) {
      deletionRequest.companyResponse = deletionRequest.completionNote;
    }
  }

  if (status === "rejected") {
    const rejectedAt = new Date();
    deletionRequest.rejectedAt = rejectedAt;
    deletionRequest.processedAt = rejectedAt;
    deletionRequest.rejectionReason = rejectionReason.trim();
    deletionRequest.companyResponse = rejectionReason.trim();
  }

  await deletionRequest.save();

  await createAuditLog({
    deletionRequest,
    action: STATUS_ACTIONS[status],
    actorId: req.user._id,
    metadata: {
      actorType: "COMPANY",
      ...(status === "rejected" ? { rejectionReason: deletionRequest.rejectionReason } : {}),
      ...(status === "completed" ? { completionNote: deletionRequest.completionNote } : {}),
    },
  });

  return res.json({
    deletionRequest: serializeDeletionRequest(deletionRequest),
    request: serializeDeletionRequest(deletionRequest),
  });
});

export const createDataRightsRequest = createDeletionRequest;
export const getDataRightsRequests = getDeletionRequests;
export const getDataRightsRequestById = getDeletionRequestById;
export const updateDataRightsRequestStatus = updateDeletionRequestStatus;
