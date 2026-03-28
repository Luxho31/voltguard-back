import express from "express";
import {
  createBoard,
  getCompanyBoards,
  getCompanyBoardByCode,
  deleteBoard,
  publicGetCompanyBoardByCode,
  publicGetCompanyBoards,
} from "../controllers/board.controller.js";

import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

//RUTAS PRIBADAS PARA ADMINISTRADORES DE EMPRESA
router.post("/create", authMiddleware, requireRole("admin"), createBoard);
router.get("/", authMiddleware, requireRole("admin"), getCompanyBoards);
router.get("/:id", authMiddleware, requireRole("admin"), getCompanyBoardByCode);
router.delete("/:id", authMiddleware, requireRole("admin"), deleteBoard);

//RUTAS PUBLICAS
router.get("/public/:publicCode", publicGetCompanyBoardByCode);
router.get("/public/company/:publicCode", publicGetCompanyBoards);

export default router;