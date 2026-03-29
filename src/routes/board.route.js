// routes/board.routes.js

import { Router } from "express";
import {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard
} from "../controllers/board.controller.js";

import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

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

router.get("/", getBoards);
router.get("/:id", getBoardById);
router.put("/:id", updateBoard);
router.delete("/:id", deleteBoard);

export default router;