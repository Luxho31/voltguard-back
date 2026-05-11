import mongoose from "mongoose";

const insulationMeasurementRowSchema = new mongoose.Schema(
  {
    circuit: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    measurement_l1_g: {
      type: Number,
      default: null,
    },

    measurement_l2_g: {
      type: Number,
      default: null,
    },

    measurement_l3_g: {
      type: Number,
      default: null,
    },

    unit: {
      type: String,
      default: "MΩ",
    },

    readingConfidence: {
      type: Number,
      default: null,
    },

    associationConfidence: {
      type: Number,
      default: null,
    },

    observation: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const insulationMeasurementSchema = new mongoose.Schema(
  {
    companyPublicCode: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
      index: true,
    },

    boardCode: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    batchCode: {
      type: String,
      required: true,
      index: true,
    },

    sourceImages: {
      boardImage: {
        type: String,
        required: true,
      },
      unifilarImage: {
        type: String,
        required: true,
      },
    },

    rows: {
      type: [insulationMeasurementRowSchema],
      default: [],
    },

    unit: {
      type: String,
      default: "MΩ",
    },

    status: {
      type: String,
      enum: ["PENDING_REVIEW", "CONFIRMED", "FAILED"],
      default: "PENDING_REVIEW",
    },

    warnings: {
      type: [String],
      default: [],
    },

    rawAiResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    importedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

insulationMeasurementSchema.index({
  boardCode: 1,
  companyPublicCode: 1,
  createdAt: -1,
});

export default mongoose.model(
  "InsulationMeasurement",
  insulationMeasurementSchema
);