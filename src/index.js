import express from "express";
import dotenv from "dotenv";
import authRoute from "./routes/auth.route.js";
import companyRoute from "./routes/company.route.js";
import boardRoute from "./routes/board.route.js";
import adminRoute from "./routes/admin.route.js";
import userRoute from "./routes/user.route.js";
import publicRoute from "./routes/public.route.js";
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
    if (allowlist.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.use("/api/auth", authRoute);
app.use("/api/company", companyRoute);
app.use("/api/board", boardRoute);
app.use("/api/admin", adminRoute);
app.use("/api/user", userRoute);
app.use("/api/public", publicRoute);

const PORT = process.env.PORT || 5080;

app.listen(PORT, () => {
  console.log("Se esta ejecutando en el puerto:", PORT);
});
