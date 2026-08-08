import mongoose from "mongoose";

const complianceDocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    documentType: {
      type: String,
      enum: ["privacy-policy", "terms", "notice", "other"],
      default: "other",
    },
    extractedText: {
      type: String,
      default: "",
    },
    aiSummary: {
      type: String,
      default: "",
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  { timestamps: true },
);

export const ComplianceDocument = mongoose.model(
  "ComplianceDocument",
  complianceDocumentSchema,
);
