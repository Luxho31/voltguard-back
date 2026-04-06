import mongoose from "mongoose";

const boardSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    tensionNominal: {
      type: Number,
      required: true,
    },
    numeroFases: {
      type: Number,
      required: true,
    },
    incluyeNeutro: {
      type: Boolean,
      required: true,
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    images: [{ type: String }],

    companyPublicCode: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const BoardModel = mongoose.model("Board", boardSchema);

export default BoardModel;