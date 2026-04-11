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
router.use(authMiddleware);

router.get("/:publicCode", getCompanyBoards);
router.get("/:publicCode/:code", getBoardByCode);

router.post(
  "/",
  requireRole("SUPERADMIN"),
  upload.fields([
    { name: "tablero", maxCount: 5 },
    { name: "unifilar", maxCount: 5 },
    { name: "leyenda", maxCount: 5 },
    { name: "termografia", maxCount: 10 },
  ]),
  createBoard
);


// router.put("/:publicCode/:code", updateBoard);
router.put(
  "/:publicCode/:code",
  requireRole("SUPERADMIN"),
  upload.fields([
    { name: "tablero", maxCount: 10 },
    { name: "unifilar", maxCount: 10 },
    { name: "leyenda", maxCount: 10 },
    { name: "termografia", maxCount: 10 },
  ]),
  updateBoard
);
router.delete("/:publicCode/:code", requireRole("SUPERADMIN"), deleteBoard);

export default router;