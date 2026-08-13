import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        firstname: { type: String, required: true },
        lastname: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },

        // ── NUEVOS CAMPOS AGREGADOS ──
        company: { type: String, required: true, trim: true },
        ruc: { type: String, required: true, trim: true },
        cargo: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        referralSource: { type: String, required: true, trim: true },

        isActive: { type: Boolean, default: true },
        role: {
            type: String,
            enum: ["SUPERADMIN", "ADMIN", "USER"],
            default: "USER",
        },

        companyPublicCode: {
            type: String,
            required: function () {
                return this.role === "ADMIN" && this.isModified("role");
            },
            default: null,
            trim: true,
        },
        plan: {
            type: String,
            enum: ["basico", "intermedio", "empresarial"],
            default: "basico",
        },
        verified: {
            type: Boolean,
            default: false,
        },

        verificationToken: {
            type: String,
            default: null,
        },

        verificationTokenExpires: {
            type: Date,
            default: null,
        },

        resetPasswordToken: { type: String, default: null },
        resetPasswordExpires: { type: Date, default: null },
    },
    {
        timestamps: true,
    },
);

const UserModel = mongoose.model("User", userSchema);
export default UserModel;