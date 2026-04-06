import { Router } from "express";
import {
  createBoard,
  getCompanyBoards,
  getCompanyBoardByCode,
  deleteBoard,
  publicGetCompanyBoardByCode,
  publicGetCompanyBoards,
  updateBoard,
} from "../controllers/board.controller.js";

import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

/**
 * =========================
 * 🌐 RUTAS PÚBLICAS
 * =========================
 */
router.get("/public/company/:publicCode", publicGetCompanyBoards);
router.get("/public/:code", publicGetCompanyBoardByCode);

/**
 * =========================
 * 🔒 RUTAS PRIVADAS (ADMIN)
 * =========================
 */
router.use(authMiddleware, requireRole("ADMIN"));

router.post(
  "/",
  upload.fields([
    { name: "tablero", maxCount: 5 },
    { name: "unifilar", maxCount: 5 },
    { name: "leyenda", maxCount: 5 },
    { name: "termografia", maxCount: 10 },
  ]),
  createBoard
);

router.get("/", getCompanyBoards);
router.get("/:code", getCompanyBoardByCode);
router.put("/:code", updateBoard);
router.delete("/:code", deleteBoard);

export default router;