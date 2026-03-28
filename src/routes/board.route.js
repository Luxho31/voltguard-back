// routes/board.routes.js

import { Router } from "express";
import {
  createBoard,
  getCompanyBoards,
  getCompanyBoardByCode,
  deleteBoard,
  publicGetCompanyBoardByCode,
  publicGetCompanyBoards,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
} from "../controllers/board.controller.js";

import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();
//RUTAS PRIBADAS PARA ADMINISTRADORES DE EMPRESA
router.post("/create", authMiddleware, requireRole("admin"), createBoard);
router.get("/", authMiddleware, requireRole("admin"), getCompanyBoards);
router.get("/:id", authMiddleware, requireRole("admin"), getCompanyBoardByCode);
router.delete("/:id", authMiddleware, requireRole("admin"), deleteBoard);

//RUTAS PUBLICAS
router.get("/public/:publicCode", publicGetCompanyBoardByCode);
router.get("/public/company/:publicCode", publicGetCompanyBoards);
// solo ADMIN
router.use(authMiddleware, requireRole("admin"));

router.post(
  "/",
  upload.fields([
    { name: "tablero", maxCount: 5 },
    { name: "unifilar", maxCount: 5 },
    { name: "leyenda", maxCount: 5 },
    { name: "termografia", maxCount: 10 }
  ]),
  createBoard
);

router.get("/", getBoards);
router.get("/:id", getBoardById);
router.put("/:id", updateBoard);
router.delete("/:id", deleteBoard);

export default router;