import AdmZip from "adm-zip";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import Board from "../models/Board.js";
import cloudinary from "../config/cloudinary.js";
import { v4 as uuidv4 } from "uuid";

const extractPath = "./uploads/extracted";

const cleanupFiles = (filePath) => {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        if (fs.existsSync(extractPath)) {
            fs.rmSync(extractPath, { recursive: true, force: true });
        }
    } catch (err) {
        console.error("Error limpiando archivos:", err);
    }
};

// 🔍 buscar excel
const findExcelFile = (dir) => {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);

        if (fs.statSync(fullPath).isDirectory()) {
            const found = findExcelFile(fullPath);
            if (found) return found;
        } else if (file.endsWith(".xlsx")) {
            return fullPath;
        }
    }

    return null;
};

// ✅ VALIDACIÓN
export const validateImport = async (req, res) => {
    try {
        if (!req.file.originalname.endsWith(".zip")) {
            return res.status(400).json({ error: "Solo .zip permitido" });
        }

        const zip = new AdmZip(req.file.path);

        if (!fs.existsSync(extractPath)) {
            fs.mkdirSync(extractPath, { recursive: true });
        }

        zip.extractAllTo(extractPath, true);

        const excelPath = findExcelFile(extractPath);

        if (!excelPath) {
            return res.json({ ok: false, errors: ["No hay Excel"] });
        }

        const workbook = XLSX.readFile(excelPath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        const errors = [];

        for (const row of data) {
            const boardCode = row.tablero_id;

            if (!boardCode) {
                errors.push("Fila sin tablero_id");
                continue;
            }

            const imgDir = path.join(extractPath, "imagenes");

            const imgs = fs.existsSync(imgDir)
                ? fs.readdirSync(imgDir).filter((f) => f.includes(boardCode))
                : [];

            const hasUnifilar = imgs.some((f) =>
                f.toLowerCase().includes("unifilar"),
            );

            if (!hasUnifilar) {
                errors.push(`Falta unifilar ${boardCode}`);
            }

            if (imgs.length === 0) {
                errors.push(`Faltan imágenes ${boardCode}`);
            }
        }

        res.json({
            ok: errors.length === 0,
            errors,
            total: data.length,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error validando" });
    } finally {
        cleanupFiles(req.file?.path); // 🔥 SIEMPRE LIMPIA
    }
};

// ✅ IMPORTACIÓN
export const runImport = async (req, res) => {
    try {
        const zip = new AdmZip(req.file.path);
        zip.extractAllTo(extractPath, true);

        const excelPath = findExcelFile(extractPath);

        const workbook = XLSX.readFile(excelPath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        for (const row of data) {
            const boardCode = row.tablero_id;

            if (!boardCode) continue;

            const companyPublicCode =
                req.body.company_code || row.company_code || "DEFAULT";

            const imgDir = path.join(extractPath, "imagenes");
            const imgs = fs.existsSync(imgDir)
                ? fs.readdirSync(imgDir).filter((f) => f.includes(boardCode))
                : [];

            const normales = [];
            const termicas = [];
            const unifilares = [];

            for (const img of imgs) {
                const publicId = `boards/${boardCode}/${img}`;

                const result = await cloudinary.uploader.upload(
                    path.join(imgDir, img),
                    {
                        public_id: publicId,
                        overwrite: true,
                    },
                );

                const name = img.toLowerCase();

                if (name.includes("termica")) {
                    termicas.push(result.secure_url);
                } else if (name.includes("unifilar")) {
                    unifilares.push(result.secure_url);
                } else {
                    normales.push(result.secure_url);
                }
            }

            const leyenda = data
                .filter((r) => r.tablero_id === boardCode)
                .map((r) => ({
                    circuito: r.circuito,
                    descripcion: r.descripcion,
                }));

            // 🔥 verificar si existe
            const existing = await Board.findOne({
                boardCode,
                companyPublicCode,
            });

            await Board.findOneAndUpdate(
                {
                    boardCode,
                    companyPublicCode,
                },
                {
                    $set: {
                        ...(existing ? {} : { code: uuidv4() }), // solo si es nuevo

                        boardCode,
                        name: row.tablero_nombre,
                        type: row.tipo_tablero || "TG",
                        tensionNominal: row.tension || 220,
                        numeroFases: row.fases || 3,
                        incluyeNeutro: true,
                        location: row.ubicacion,
                        description: row.descripcion || "",
                        leyenda,
                        companyPublicCode,
                        createdBy: req.user._id,
                    },
                    $addToSet: {
                        "images.tablero": { $each: normales },
                        "images.termografia": { $each: termicas },
                        "images.unifilar": { $each: unifilares },
                    },
                },
                {
                    new: true,
                    upsert: true,
                },
            );
        }

        res.json({ message: "Importación completada correctamente" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error importando" });
    } finally {
        cleanupFiles(req.file?.path); // 🔥 SIEMPRE LIMPIA
    }
};
