import express from "express";
import { createCompany, getPublicCompanies, getBoardsByCompanyCode } from "../controllers/company.controller.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/create", authMiddleware, roleMiddleware(["superadmin"]), createCompany);
router.get("/", getPublicCompanies);
router.get("/:code/boards", getBoardsByCompanyCode);

export default router;