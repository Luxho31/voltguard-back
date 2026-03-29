import express from "express";
import { registerSuperAdmin, login, logout } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register-superadmin", registerSuperAdmin);
router.post("/login", login);
router.post("/logout", logout);
router.get("/profile", authMiddleware, profile);

export default router;