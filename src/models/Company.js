import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        ruc: { type: String },
        publicCode: {
            type: String,
            unique: true,
            required: true,
        }
    },
    {
        timestamps: true,
    },
);

const CompanyModel = mongoose.model("Company", companySchema);

export default CompanyModel;
