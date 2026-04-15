// routes/import.routes.js
import express from "express";
import multer from "multer";
import { validateImport, runImport } from "../controllers/import.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post(
  "/validate",
  authMiddleware,
  upload.single("file"),
  validateImport
);

router.post(
  "/run",
  authMiddleware,
  upload.single("file"),
  runImport
);

export default router;