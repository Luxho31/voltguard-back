// src/routes/admin.routes.js
import express from "express";
import { createAdmin, deleteAdmin, getAdmins, updateAdmin } from "../controllers/admin.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Todas protegidas + solo superadmin
router.use(authMiddleware, requireRole("SUPERADMIN"));

router.post("/", createAdmin);
router.get("/", getAdmins);
router.put("/:id", updateAdmin);
router.delete("/:id", deleteAdmin);

export default router;