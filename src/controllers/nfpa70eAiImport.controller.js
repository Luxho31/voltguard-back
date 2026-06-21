import path from "path";
import openai from "../config/openai.js";
import cloudinary from "../config/cloudinary.js";
import Board from "../models/Board.js";
import AdmZip from "adm-zip";

const bufferToDataUrl = (buffer, mimetype) => {
    const base64 = buffer.toString("base64");
    return `data:${mimetype};base64,${base64}`;
};

const itmSchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "manufacturer",
        "model",
        "amperage",
        "voltage",
        "breakingCapacityKA",
        "breakerType",
        "warnings",
    ],
    properties: {
        manufacturer: { type: ["string", "null"] },
        model: { type: ["string", "null"] },
        amperage: { type: ["number", "null"] },
        voltage: { type: ["number", "null"] },
        breakingCapacityKA: { type: ["number", "null"] },
        breakerType: { type: ["string", "null"] },
        warnings: { type: "array", items: { type: "string" } },
    },
};

const uploadItmImageToCloudinary = async ({buffer, boardCode, originalName}) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: `boards/${boardCode}/itm`,
                resource_type: "image",
                public_id: `itm_${Date.now()}_${path.parse(originalName).name}`,
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
};

const analyzeITMWithOpenAI = async ({ images }) => {
    const content = [
        {
            type: "input_text",
            text: `
Analiza fotografías de un interruptor principal industrial.
Extrae:
- fabricante
- modelo
- amperaje
- voltaje
- capacidad interruptiva kA
- tipo de interruptor

REGLAS:
MCCB = Caja Moldeada
MCB = Miniatura
ACB = Aire

No inventes datos. Si no se ve, usa null. Devuelve únicamente JSON.`,
        },
    ];

    for (const img of images) {
        const imageDataUrl = bufferToDataUrl(img.buffer, img.mimetype);
        content.push({
            type: "input_image",
            image_url: imageDataUrl,
            detail: "high",
        });
    }

    const response = await openai.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [{ role: "user", content }],
        text: {
            format: {
                type: "json_schema",
                name: "itm_extraction",
                strict: true,
                schema: itmSchema,
            },
        },
        max_output_tokens: 1500,
    });

    return JSON.parse(response.output_text);
};

const generateNfpaData = (itmData) => {
    const voltage = itmData.voltage || 380;
    const amperaje = itmData.amperage || 150;

    let tipoInterruptor = "Caja Moldeada";
    const siglaDetectada = (itmData.breakerType || "").toUpperCase();

    if (siglaDetectada.includes("MCCB") || siglaDetectada.includes("MOLDEADA") || siglaDetectada.includes("CAJA MOLDEADA")) {
        tipoInterruptor = "Caja Moldeada";
    } else if (siglaDetectada.includes("ACB") || siglaDetectada.includes("AIRE") || siglaDetectada.includes("BASTIDOR")) {
        tipoInterruptor = "Caja Abierta (Bastidor)";
    } else if (siglaDetectada.includes("MCB") || siglaDetectada.includes("MINIATURA") || siglaDetectada.includes("DIN")) {
        tipoInterruptor = "Riel DIN (Miniatura)";
    } else {
        if (amperaje <= 125) tipoInterruptor = "Riel DIN (Miniatura)";
        else if (amperaje > 1000) tipoInterruptor = "Caja Abierta (Bastidor)";
    }

    let shortCircuitCurrent = itmData.breakingCapacityKA || null;
    if (!shortCircuitCurrent) {
        if (amperaje <= 125) shortCircuitCurrent = 10;
        else if (amperaje > 125 && amperaje <= 400) shortCircuitCurrent = 22;
        else if (amperaje > 400 && amperaje <= 1000) shortCircuitCurrent = 35;
        else if (amperaje > 1000) shortCircuitCurrent = 50;
    }

    let arcData = {
        riskCategory: 1,
        incidentEnergy: "3.13 cal/cm²",
        arcDistance: "0.74 m",
        eppRequerido: [
            "Casco de Seguridad de Polímero Tipo E con Careta Facial AR (Mín. 4 cal/cm²)",
            "Lentes de Seguridad de Policarbonato con protección UV",
            "Camisa de manga larga y pantalón de trabajo AR (Mínimo 4 cal/cm² a 8 cal/cm²)",
            "Guantes de Cuero para Trabajo Mecánico o Dieléctricos según corresponda",
            "Zapatos Dieléctricos de Seguridad con puntera de composite",
        ],
    };

    if (amperaje > 125 && amperaje <= 400) {
        arcData = {
            riskCategory: 2,
            incidentEnergy: "7.8 cal/cm²",
            arcDistance: "0.91 m",
            eppRequerido: [
                "Casco integrado con Careta Facial AR Libre con Mentonera (Mín. 8 cal/cm²)",
                "Lentes de Seguridad de Policarbonato con protectores laterales",
                "Camisa de Trabajo AR y Pantalón de Trabajo Industrial AR (Resistentes a 8 cal/cm²)",
                "Guantes de Cuero para Trabajo Mecánico",
                "Zapatos Dieléctricos de Seguridad",
            ],
        };
    } else if (amperaje > 400) {
        arcData = {
            riskCategory: 4,
            incidentEnergy: "32.0 cal/cm²",
            arcDistance: "1.52 m",
            eppRequerido: [
                "Capucha de Traje de Arco (Escafandra) certificada de 25 a 40 cal/cm²",
                "Lentes de Seguridad de Policarbonato (obligatorios bajo la escafandra)",
                "Traje de Arco de Alta Densidad (Chaqueta y Pantalón Peto ignífugo multicapa)",
                "Guantes Dieléctricos de Goma con Protectores de Cuero (Sobreguantes)",
                "Botas Dieléctricas de Caña Alta (Hule/Goma)",
            ],
        };
    }

    let limiteAproximacion = "1.07 m";
    let distanciaRestringida = "0.31 m";
    let shockGloveClass = "Clase 00 (Hasta 500 VCA) con guantes de piel";

    if (voltage > 250 && voltage <= 600) {
        limiteAproximacion = "1.07 m";
        distanciaRestringida = "0.31 m";
        shockGloveClass = "Clase 0 (Hasta 1,000 VCA) con guantes de piel";
    } else if (voltage > 600) {
        limiteAproximacion = "1.52 m";
        distanciaRestringida = "0.61 m";
        shockGloveClass = "Clase 1 (Hasta 7,500 VCA) con guantes de piel";
    }

    return {
        amperajePrincipal: amperaje,
        tipoInterruptor,
        corrienteCortocircuito: shortCircuitCurrent,
        distanciaTrabajo: "45.72 cm (18 in)",
        distanciaArco: arcData.arcDistance,
        energiaIncidente: arcData.incidentEnergy,
        categoriaRiesgo: arcData.riskCategory,
        limiteAproximacion,
        distanciaRestringida,
        guantesClase: shockGloveClass,
        eppRequerido: arcData.eppRequerido,
        calculadoPorIA: true,
        origenDatos: "FOTO_ITM_REAL",
        updatedAt: new Date()
    };
};

const getBoardCodeFromFileName = (filename) => {
    return path.parse(filename).name.split("_")[0].trim().toUpperCase();
};

const getMimeTypeFromFileName = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    };
    return mimeTypes[ext] || null;
};

export const createNfpaLabelsFromZip = async (req, res) => {
    try {
        const { companyCode } = req.body;

        if (!companyCode) {
            return res.status(400).json({ ok: false, error: "Debes enviar companyCode." });
        }

        if (!req.file) {
            return res.status(400).json({ ok: false, error: "Debes subir un archivo ZIP en el campo file." });
        }

        const zip = new AdmZip(req.file.buffer);
        const entries = zip.getEntries();

        // Filtrar solo imágenes válidas dentro del ZIP
        const imageEntries = entries.filter((entry) => {
            if (entry.isDirectory) return false;
            const ext = path.extname(entry.entryName).toLowerCase();
            return [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
        });

        if (imageEntries.length === 0) {
            return res.status(400).json({ ok: false, error: "El ZIP no contiene imágenes válidas." });
        }

        // Agrupar imágenes por código de tablero por si mandan más de una foto del mismo ITM
        const groupedItmImages = {};
        for (const entry of imageEntries) {
            const originalName = path.basename(entry.entryName);
            const boardCode = getBoardCodeFromFileName(originalName);

            if (!groupedItmImages[boardCode]) {
                groupedItmImages[boardCode] = [];
            }

            groupedItmImages[boardCode].push({
                originalName,
                buffer: entry.getData(),
                mimetype: getMimeTypeFromFileName(originalName),
            });
        }

        const results = [];

        // Procesar cada tablero agrupado en el ZIP
        for (const [boardCode, images] of Object.entries(groupedItmImages)) {
            try {
                // 🚨 REGLA CRÍTICA: Buscar si el tablero ya existe en el sistema
                const board = await Board.findOne({
                    boardCode: boardCode.toUpperCase(),
                    companyPublicCode: companyCode,
                });

                if (!board) {
                    results.push({
                        boardCode,
                        status: "failed",
                        error: "El código no coincide con ningún tablero registrado en el sistema.",
                    });
                    continue;
                }

                // Analizar el grupo de fotos del ITM con OpenAI
                const itmResult = await analyzeITMWithOpenAI({ images });

                // Calcular parámetros técnicos NFPA 70E
                const nfpaCalculatedData = generateNfpaData(itmResult);

                // Subir imágenes del lote a Cloudinary
                const uploadedUrls = [];
                for (const img of images) {
                    const url = await uploadItmImageToCloudinary({
                        buffer: img.buffer,
                        boardCode,
                        originalName: img.originalName,
                    });
                    uploadedUrls.push(url);
                }

                // Actualizar tablero en MongoDB
                await Board.findByIdAndUpdate(board._id, {
                    $set: { nfpa: nfpaCalculatedData },
                    $push: { "images.itm": { $each: uploadedUrls } },
                });

                results.push({
                    boardCode,
                    status: "created",
                    boardId: board._id,
                    warnings: itmResult.warnings || [],
                });

            } catch (error) {
                console.error(`Error procesando lote NFPA para [${boardCode}]:`, error);
                results.push({
                    boardCode,
                    status: "failed",
                    error: error.message,
                });
            }
        }

        return res.status(200).json({
            ok: true,
            total: Object.keys(groupedItmImages).length,
            created: results.filter((r) => r.status === "created").length,
            failed: results.filter((r) => r.status === "failed").length,
            results,
        });

    } catch (error) {
        console.error("Error procesando lote ZIP de ITMs:", error);
        return res.status(500).json({
            ok: false,
            error: error.message || "Error interno importando ZIP de interruptores.",
        });
    }
};