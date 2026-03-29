import express from "express";
import { createCompany, getPublicCompanies, getBoardsByCompanyCode } from "../controllers/company.controller.js";
import { authMiddleware, requireRole} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/create", authMiddleware, requireRole("SUPERADMIN"), createCompany);
router.get("/", getPublicCompanies);
router.get("/:code/boards", getBoardsByCompanyCode);

export default router;