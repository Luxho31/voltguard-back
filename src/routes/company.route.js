import { Router } from "express";
import {
  createCompany,
  getCompanies,
  getCompanyByCode,
  updateCompany,
  deleteCompany,
  publicGetCompanies,
  getBoardsByCompanyCode,
} from "../controllers/company.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();

// 🌐 Públicas / USER
router.get("/public", publicGetCompanies);
router.get("/public/:code/boards", getBoardsByCompanyCode);

// 🔒 Privadas / SUPERADMIN
router.use(authMiddleware, requireRole("SUPERADMIN"));

router.post("/", createCompany);
router.get("/", getCompanies);
router.get("/:publicCode", getCompanyByCode);
router.put("/:publicCode", updateCompany);
router.delete("/:publicCode", deleteCompany);

export default router;