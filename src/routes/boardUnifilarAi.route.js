import { Router } from "express";
import { importBoardsFromUnifilarZip } from "../controllers/boardUnifilarAi.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

router.post(
  "/import-unifilares",
  authMiddleware,
  upload.single("file"),
  importBoardsFromUnifilarZip
);

export default router;