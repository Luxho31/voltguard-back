import express from "express";
import { createCompany, getBoardsByCompanyCode, getCompanies } from "../controllers/company.controller.js";
import { authMiddleware, requireRole} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/create", authMiddleware, requireRole("SUPERADMIN"), createCompany);
router.get("/", getCompanies);
router.get("/:code/boards", getBoardsByCompanyCode);

export default router;