// routes/board.routes.js

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
//RUTAS PRIBADAS PARA ADMINISTRADORES DE EMPRESA
router.post("/create", authMiddleware, requireRole("ADMIN"), createBoard);
router.get("/", authMiddleware, requireRole("ADMIN"), getCompanyBoards);
router.get("/:id", authMiddleware, requireRole("ADMIN"), getCompanyBoardByCode);
router.delete("/:id", authMiddleware, requireRole("ADMIN"), deleteBoard);

//RUTAS PUBLICAS
router.get("/public/:publicCode", publicGetCompanyBoardByCode);
router.get("/public/company/:publicCode", publicGetCompanyBoards);

// solo ADMIN
router.use(authMiddleware, requireRole("ADMIN"));

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

export default router;