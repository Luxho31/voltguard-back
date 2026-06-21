import { Router } from "express";
import { createNfpaLabelsFromZip } from "../controllers/nfpa70eAiImport.controller.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

// Endpoint independiente para subir fotos del interruptor (ITM) y actualizar NFPA
router.post(
    "/generate-label",
    upload.single("file"), // Recibe hasta 3 fotos en el campo 'itm_images'
    createNfpaLabelsFromZip
);

export default router;