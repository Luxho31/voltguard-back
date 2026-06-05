import express from "express";
import { subscription } from "../controllers/subscription.controller.js"
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router()

router.put("/", authMiddleware, subscription);

export default router;