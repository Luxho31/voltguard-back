import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        firstname: { type: String, required: true },
        lastname: { type: String, required: true },
        email: { type: String, required: true },
        isActive: { type: Boolean, default: true },
        password: { type: String, required: true },
        role: { type: String, enum: ["SUPERADMIN", "ADMIN"], default: "ADMIN" },
        company: {
            type: String,
            required: function () {
                return this.role === "ADMIN";
            },
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

const UserModel = mongoose.model("User", userSchema);

export default UserModel;
