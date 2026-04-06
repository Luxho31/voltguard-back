import { Router } from "express";
import {
  createBoard,
  getCompanyBoards,
  getBoardByCode,
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
router.get("/public/:publicCode/:code", publicGetCompanyBoardByCode);

/**
 * =========================
 * 🔒 RUTAS PRIVADAS (ADMIN)
 * =========================
 */
router.use(authMiddleware, requireRole("SUPERADMIN"));

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

router.get("/:publicCode", getCompanyBoards);
router.get("/:publicCode/:code", getBoardByCode);
router.put("/:publicCode/:code", updateBoard);
router.delete("/:publicCode/:code", deleteBoard);

export default router;