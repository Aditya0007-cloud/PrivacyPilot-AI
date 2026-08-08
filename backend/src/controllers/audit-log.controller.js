import { AuditLog } from "../models/AuditLog.js";
import { asyncHandler } from "../utils/async-handler.js";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const serializeAuditLog = (log) => ({
  id: log._id.toString(),
  userId: log.userId.toString(),
  companyId: log.companyId.toString(),
  action: log.action,
  resourceType: log.resourceType,
  resourceId: log.resourceId.toString(),
  metadata: log.metadata || {},
  timestamp: log.timestamp,
});

const buildDateFilter = ({ startDate, endDate }) => {
  const timestamp = {};

  if (startDate) {
    timestamp.$gte = new Date(startDate);
  }

  if (endDate) {
    timestamp.$lte = new Date(endDate);
  }

  return Object.keys(timestamp).length > 0 ? { timestamp } : {};
};

export const getAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const skip = (page - 1) * limit;

  const query = {
    ...(req.user.role === "company"
      ? { companyId: req.user._id }
      : { userId: req.user._id }),
    ...buildDateFilter(req.query),
  };

  if (req.query.action) {
    query.action = req.query.action;
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(query),
  ]);

  return res.json({
    auditLogs: logs.map(serializeAuditLog),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});
