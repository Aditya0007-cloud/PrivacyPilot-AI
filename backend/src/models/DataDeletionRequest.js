import mongoose from "mongoose";

const dataDeletionRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    requestType: {
      type: String,
      enum: ["data_deletion", "data_access", "data_correction", "processing_information"],
      default: "data_deletion",
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "in_progress", "completed", "rejected"],
      default: "pending",
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    processingStartedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },
    completionNote: {
      type: String,
      trim: true,
      default: "",
    },
    companyResponse: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

export const DataDeletionRequest = mongoose.model(
  "DataDeletionRequest",
  dataDeletionRequestSchema,
);
