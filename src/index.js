import express from "express";
import dotenv from "dotenv";
import authRoute from "./routes/auth.route.js"
import companyRoute from "./routes/company.route.js"
import boardRoute from "./routes/board.route.js"
import superadminRoute from "./routes/superadmin.route.js"
import connectDB from "./config/db.js"
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());
app.use(cookieParser());

dotenv.config();
connectDB();

const allowlist = [process.env.FRONTEND_URL];
const corsOptions = {
    origin: function (origin, callback) {
        if (allowlist.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
};

app.use(cors(corsOptions));

app.use("/api/v1/auth", authRoute);
app.use("/api/v1/company", companyRoute);
app.use("/api/v1/board", boardRoute);
app.use("/api/v1/superadmin", superadminRoute);

app.listen(process.env.PORT, () => {
    console.log("Se esta ejecutando en el puerto:", process.env.PORT)
});