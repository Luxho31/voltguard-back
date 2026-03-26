import express from "express";
import {
  createBoard,
  getBoards,
  getBoardByCode,
  deleteBoard
} from "../controllers/board.controller.js";

import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, requireRole("admin"), createBoard);
router.get("/", authMiddleware, requireRole("admin"), getBoards);
router.delete("/:id", authMiddleware, requireRole("admin"), deleteBoard);

// PUBLICO (QR)
router.get("/:code", getBoardByCode);

export default router;