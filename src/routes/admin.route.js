// src/routes/admin.routes.js
import express from "express";
import { createAdmin, getAdmins } from "../controllers/superadmin.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";

const router = express.Router();

router.post(
  "/create",
  authMiddleware,
  roleMiddleware(["superadmin"]), // 👈 SOLO superadmin
  createAdmin
);
router.get("/", authMiddleware, roleMiddleware(["superadmin"]), getAdmins);

export default router;