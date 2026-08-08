import mongoose from "mongoose";

const consentRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dataPrincipalEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["granted", "withdrawn", "expired"],
      default: "granted",
    },
    source: {
      type: String,
      default: "manual",
    },
  },
  { timestamps: true },
);

export const ConsentRecord = mongoose.model("ConsentRecord", consentRecordSchema);
