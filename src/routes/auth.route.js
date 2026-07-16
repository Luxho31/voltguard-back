import express from "express";
import { registerSuperAdmin, login, logout, getProfile, register, testEmail, verifyEmail, forgotPassword, resetPassword } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register-superadmin", registerSuperAdmin);
router.get("/verify-email/:token", verifyEmail);
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/profile", authMiddleware, getProfile);
router.post("/test-email", testEmail);

// --- Rutas de Recuperación ---
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);


export default router;