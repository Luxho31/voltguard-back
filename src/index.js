import express from "express";
import dotenv from "dotenv";
import authRoute from "./routes/auth.route.js";
import companyRoute from "./routes/company.route.js";
import boardRoute from "./routes/board.route.js";
import adminRoute from "./routes/admin.route.js";
import userRoute from "./routes/user.route.js";
import publicRoute from "./routes/public.route.js";
import importRoute from "./routes/import.route.js";
import connectDB from "./config/db.js";
import cors from "cors";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();

connectDB();

app.use(express.json());
app.use(cookieParser());

const allowlist = [process.env.FRONTEND_URL];

const corsOptions = {
    origin: function (origin, callback) {
        if (allowlist.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
};

app.use(cors(corsOptions));

app.use("/api/v1/auth", authRoute);
app.use("/api/v1/company", companyRoute);
app.use("/api/v1/board", boardRoute);
app.use("/api/v1/admin", adminRoute);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/public", publicRoute);
app.use("/api/v1/import", importRoute);

const PORT = process.env.PORT || 5080;

app.listen(PORT, () => {
  console.log("Se esta ejecutando en el puerto:", PORT);
});
