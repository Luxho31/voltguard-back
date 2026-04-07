import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        firstname: { type: String, required: true },
        lastname: { type: String, required: true },
        email: { type: String, required: true },
        password: { type: String, required: true },
        isActive: { type: Boolean, default:true },
        role: { type: String, enum: ["SUPERADMIN", "ADMIN", "USER"], default: "ADMIN" },
        company: {
             type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
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