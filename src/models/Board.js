import mongoose from "mongoose";

const boardSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        location: { type: String },
        description: { type: String },
        images: [{ type: String }],
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        qrCode: { type: String },
    },
    {
        timestamps: true,
    },
);

const BoardModel = mongoose.model("Board", boardSchema);

export default BoardModel;
