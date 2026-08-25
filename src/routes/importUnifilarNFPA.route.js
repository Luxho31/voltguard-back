import express from "express";
// import multer from "multer";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { importBoardsWithNfpaFromZip } from "../controllers/importUnifilarNFPA.controller.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = express.Router();

// const upload = multer({ dest: "uploads/" });

router.post(
    "/import-zip",
    authMiddleware, // Protegido por JWT/Token
    upload.single("file"), // Debe coincidir con formData.append("file", file)
    importBoardsWithNfpaFromZip
);

export default router;