// src/routes/admin.routes.js
import express from "express";
import { createAdmin, getAdmins } from "../controllers/admin.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";

const router = Router();

// Todas protegidas + solo superadmin
router.use(authMiddleware, requireRole("SUPERADMIN"));

router.post("/", createAdmin);
router.get("/", getAdmins);
router.put("/:id", updateAdmin);
router.delete("/:id", deleteAdmin);

export default router;