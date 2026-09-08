import express from 'express';
import { uploadIticCsv, getIticEvents } from '../controllers/voltageEvent.controller.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = express.Router();

// POST: Subir archivo CSV de eventos (Metrel)
router.post('/:boardId/upload-itic', upload.single('file'), uploadIticCsv);

// GET: Obtener eventos procesados para la curva ITIC
router.get('/:boardId', getIticEvents);

export default router;