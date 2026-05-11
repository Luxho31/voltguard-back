import express from "express";
import multer from "multer";

import {
  validateInsulationZip,
  runInsulationZip,
  testInsulationZip,
  createBoardInsulationMeasurement,
  updateBoardInsulationMeasurement,
  deleteBoardInsulationMeasurement,
} from "../controllers/insulation.controller.js";

const router = express.Router();

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith(".zip")) {
      return cb(new Error("Solo se permite subir archivo .zip."));
    }

    cb(null, true);
  },
});

router.post("/zip/validate", upload.single("file"), validateInsulationZip);
router.post("/zip/run", upload.single("file"), runInsulationZip);
router.post("/zip/test", upload.single("file"), testInsulationZip);
router.post("/boards/:code/measurements", createBoardInsulationMeasurement);
router.patch("/boards/:code/measurements", updateBoardInsulationMeasurement);
router.delete("/boards/:code/measurements", deleteBoardInsulationMeasurement);

export default router;