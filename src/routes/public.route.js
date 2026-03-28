// routes/public.routes.js

import { Router } from "express";
import Board from "../models/Board.js";

const router = Router();

// público (sin auth)
router.get("/board/:code", async (req, res) => {
  try {
    const board = await Board.findOne({ code: req.params.code });

    if (!board) {
      return res.status(404).json({ message: "No encontrado" });
    }

    res.json(board);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;