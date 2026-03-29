import express from "express";
import { registerSuperAdmin, login, logout, getProfile } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register-superadmin", registerSuperAdmin);
router.post("/login", login);
router.post("/logout", logout);
router.get("/profile", authMiddleware, getProfile);

export default router;