import mongoose from "mongoose";

const privacyPolicySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    extractedText: {
      type: String,
      required: true,
    },
    analysis: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    complianceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    riskLevel: {
      type: String,
      enum: ["Low", "Medium", "High"],
      required: true,
    },
  },
  { timestamps: true },
);

export const PrivacyPolicy = mongoose.model("PrivacyPolicy", privacyPolicySchema);
