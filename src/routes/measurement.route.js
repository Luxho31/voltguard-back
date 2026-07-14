import { Router } from "express"
import { upload } from "../middlewares/upload.middleware.js";
import { chartData, importMetrel } from "../controllers/measurement.controller.js";

const router = Router()

router.post('/import-metrel/:boardId', upload.single('file'), importMetrel)
router.get('/chart-data/:boardId', chartData)

export default router;