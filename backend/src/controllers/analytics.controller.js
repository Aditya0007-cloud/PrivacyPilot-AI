import { AuditLog } from "../models/AuditLog.js";
import { Consent } from "../models/Consent.js";
import { DataDeletionRequest } from "../models/DataDeletionRequest.js";
import { PrivacyPolicy } from "../models/PrivacyPolicy.js";
import { asyncHandler } from "../utils/async-handler.js";
import { withMongoRetry } from "../utils/mongo-retry.js";

const serializeActivity = (log) => ({
  id: log._id.toString(),
  action: log.action,
  resourceType: log.resourceType,
  resourceId: log.resourceId.toString(),
  status: log.metadata?.status || "",
  timestamp: log.timestamp,
  actorId: log.metadata?.actorId || log.userId.toString(),
});

const distribution = (items, statuses) =>
  statuses.map((status) => ({
    name: status.label,
    value: items.filter((item) => item.status === status.value).length,
  }));

const uniqueUserCount = (...groups) => {
  const ids = new Set();

  groups.flat().forEach((item) => {
    if (item.userId) {
      ids.add(item.userId.toString());
    }
  });

  return ids.size;
};

export const getCompanyAnalytics = asyncHandler(async (req, res) => {
  const [consents, deletionRequests, latestPolicy, auditLogs] = await withMongoRetry(() =>
    Promise.all([
      Consent.find({ companyId: req.user._id }).sort({ updatedAt: -1 }),
      DataDeletionRequest.find({ companyId: req.user._id }).sort({ updatedAt: -1 }),
      PrivacyPolicy.findOne({ companyId: req.user._id }).sort({ createdAt: -1 }),
      AuditLog.find({ companyId: req.user._id }).sort({ timestamp: -1 }).limit(10),
    ]),
  );

  const grantedConsents = consents.filter((consent) => consent.status === "granted").length;
  const withdrawnConsents = consents.filter((consent) => consent.status === "withdrawn").length;
  const pendingDeletionRequests = deletionRequests.filter(
    (request) => request.status === "pending",
  ).length;
  const acceptedDeletionRequests = deletionRequests.filter(
    (request) => request.status === "accepted",
  ).length;
  const inProgressDeletionRequests = deletionRequests.filter(
    (request) => request.status === "in_progress",
  ).length;
  const completedDeletionRequests = deletionRequests.filter(
    (request) => request.status === "completed",
  ).length;
  const rejectedDeletionRequests = deletionRequests.filter(
    (request) => request.status === "rejected",
  ).length;

  return res.json({
    analytics: {
      totalUsers: uniqueUserCount(consents, deletionRequests),
      totalConsents: consents.length,
      grantedConsents,
      withdrawnConsents,
      pendingDeletionRequests,
      acceptedDeletionRequests,
      inProgressDeletionRequests,
      completedDeletionRequests,
      rejectedDeletionRequests,
      latestComplianceScore: latestPolicy?.complianceScore || null,
      latestRiskLevel: latestPolicy?.riskLevel || null,
      totalComplianceGaps: latestPolicy?.analysis?.complianceGaps?.length || 0,
      lastPolicyAnalysisDate: latestPolicy?.createdAt || null,
      consentDistribution: distribution(consents, [
        { label: "Granted", value: "granted" },
        { label: "Withdrawn", value: "withdrawn" },
      ]),
      deletionRequestDistribution: distribution(deletionRequests, [
        { label: "Pending", value: "pending" },
        { label: "Accepted", value: "accepted" },
        { label: "In Progress", value: "in_progress" },
        { label: "Completed", value: "completed" },
        { label: "Rejected", value: "rejected" },
      ]),
      recentConsentActivity: auditLogs
        .filter((log) => log.resourceType === "Consent")
        .map(serializeActivity),
      recentDeletionActivity: auditLogs
        .filter((log) =>
          ["DataDeletionRequest", "DataRightsRequest"].includes(log.resourceType),
        )
        .map(serializeActivity),
      recentPrivacyActivity: auditLogs.map(serializeActivity),
    },
  });
});

export const getUserAnalytics = asyncHandler(async (req, res) => {
  const [consents, deletionRequests, auditLogs] = await withMongoRetry(() =>
    Promise.all([
      Consent.find({ userId: req.user._id }).sort({ updatedAt: -1 }),
      DataDeletionRequest.find({ userId: req.user._id }).sort({ updatedAt: -1 }),
      AuditLog.find({ userId: req.user._id }).sort({ timestamp: -1 }).limit(10),
    ]),
  );

  const grantedConsents = consents.filter((consent) => consent.status === "granted").length;
  const withdrawnConsents = consents.filter((consent) => consent.status === "withdrawn").length;
  const activeDeletionRequest =
    deletionRequests.find((request) =>
      ["pending", "accepted", "in_progress"].includes(request.status),
    ) ||
    null;

  return res.json({
    analytics: {
      totalConsents: consents.length,
      grantedConsents,
      withdrawnConsents,
      activeDeletionRequest: activeDeletionRequest
        ? {
            id: activeDeletionRequest._id.toString(),
            status: activeDeletionRequest.status,
            requestedAt: activeDeletionRequest.requestedAt,
          }
        : null,
      latestDeletionRequest: deletionRequests[0]
        ? {
            id: deletionRequests[0]._id.toString(),
            status: deletionRequests[0].status,
            requestedAt: deletionRequests[0].requestedAt,
            processedAt: deletionRequests[0].processedAt,
          }
        : null,
      recentPrivacyActivity: auditLogs.map(serializeActivity),
    },
  });
});
