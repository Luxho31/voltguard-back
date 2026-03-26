// src/routes/superadmin.routes.js
import express from "express";
import {
  createSuperAdmin,
  getSuperAdmins,
  getSuperAdminById,
  updateSuperAdmin,
  deleteSuperAdmin,
} from "../controllers/superadmin.controller.js";

import { authMiddleware } from "../middlewares/auth.middleware.js";
import { isSuperAdmin } from "../middlewares/role.middleware.js";

const router = express.Router();

router.use(authMiddleware, isSuperAdmin);

router.post("/", createSuperAdmin);
router.get("/", getSuperAdmins);
router.get("/:id", getSuperAdminById);
router.put("/:id", updateSuperAdmin);
router.delete("/:id", deleteSuperAdmin);

export default router;