import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        firstname: { type: String, required: true },
        lastname: { type: String, required: true },
        email: { type: String, required: true },
        password: { type: String, required: true },
        isActive: { type: Boolean, default:true },
        role: { type: String, enum: ["SUPERADMIN", "ADMIN", "USER"], default: "USER" },
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

// // 🔒 Encriptar password
// userSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next;

//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next;
// });

// // 🔑 Comparar password
// userSchema.methods.comparePassword = async function (password) {
//   return await bcrypt.compare(password, this.password);
// };

const UserModel = mongoose.model("User", userSchema);
export default UserModel;