import express from "express";
import { createCompany } from "../controllers/company.controller.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, roleMiddleware(["admin"]), createCompany);

export default router;