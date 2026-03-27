import mongoose from "mongoose";

const boardSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        code: { type: String },
        location: { type: String },
        description: { type: String },

        company: { type: String, required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        images: {
            tablero: [
                {
                    url: { type: String },
                    public_id: { type: String },
                },
            ],
            unifilar: [
                {
                    url: { type: String },
                    public_id: { type: String },
                },
            ],
            leyenda: [
                {
                    url: { type: String },
                    public_id: { type: String },
                },
            ],
            termografia: [
                {
                    url: { type: String },
                    public_id: { type: String },
                },
            ],
        },
    },
    {
        timestamps: true,
    },
);

const BoardModel = mongoose.model("Board", boardSchema);

export default BoardModel;
