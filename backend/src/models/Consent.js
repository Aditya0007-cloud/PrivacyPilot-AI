import mongoose from "mongoose";

const consentSchema = new mongoose.Schema(
  {
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
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    dataCategory: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["granted", "withdrawn"],
      default: "granted",
      required: true,
    },
    grantedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    withdrawnAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

export const Consent = mongoose.model("Consent", consentSchema);
