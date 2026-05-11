import path from "path";
import { v4 as uuidv4 } from "uuid";

import openai from "../config/openai.js";
import cloudinary from "../config/cloudinary.js";
import Board from "../models/Board.js";
import Company from "../models/Company.js";
import AdmZip from "adm-zip";

const getBoardCodeFromFileName = (filename) => {
    return path.parse(filename).name.trim().toUpperCase();
};

const bufferToDataUrl = (buffer, mimetype) => {
    const base64 = buffer.toString("base64");
    return `data:${mimetype};base64,${base64}`;
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

const uploadBufferToCloudinary = (buffer, boardCode, originalName) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: `boards/${boardCode}/unifilar`,
                resource_type: "image",
                public_id: path.parse(originalName).name,
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            },
        );

        stream.end(buffer);
    });
};

const boardUnifilarSchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "name",
        "type",
        "location",
        "description",
        "tensionNominal",
        "numeroFases",
        "incluyeNeutro",
        "sistema",
        "circuits",
        "warnings",
    ],
    properties: {
        name: { type: ["string", "null"] },
        type: { type: ["string", "null"] },
        location: { type: ["string", "null"] },
        description: { type: ["string", "null"] },
        tensionNominal: { type: ["number", "null"] },
        numeroFases: { type: ["number", "null"] },
        incluyeNeutro: { type: ["boolean", "null"] },
        sistema: {
            type: ["string", "null"],
            enum: ["MONOFASICO", "TRIFASICO", null],
        },
        circuits: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["circuito", "description"],
                properties: {
                    circuito: { type: ["string", "null"] },
                    description: { type: ["string", "null"] },
                },
            },
        },
        warnings: {
            type: "array",
            items: { type: "string" },
        },
    },
};

const analyzeUnifilarWithOpenAI = async ({ buffer, mimetype, boardCode }) => {
    const imageDataUrl = bufferToDataUrl(buffer, mimetype);

    const response = await openai.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
            {
                role: "system",
                content: `
Eres un ingeniero electricista especialista en interpretación de diagramas unifilares industriales.

Tu tarea es analizar diagramas unifilares eléctricos y devolver ÚNICAMENTE JSON válido siguiendo estrictamente el schema proporcionado.

Tu objetivo es llenar automáticamente un registro de tablero eléctrico.

REGLAS CRÍTICAS:

- NO inventes información.
- Si un dato no aparece claramente usa null.
- NO generes texto fuera del JSON.
- NO expliques nada.
- NO uses markdown.
- NO agregues propiedades adicionales.
- Extrae TODOS los circuitos visibles.
- Los circuitos SIEMPRE deben venir ordenados visualmente de arriba hacia abajo.
- Ignora completamente pruebas de aislamiento.
- Ignora mediciones MΩ.
- Ignora termografías.
- Ignora sellos, firmas y notas administrativas.

REGLAS DE INTERPRETACIÓN:

1. boardCode
- El código del tablero viene PRIORITARIAMENTE del nombre del archivo.
- Si el diagrama muestra otro código visible más preciso, úsalo como "name" pero NO reemplaces boardCode.

2. name
- Corresponde al nombre visible principal del tablero.
- Ejemplo:
  "TABLERO TG-SE"
  "TG-SE"
  "TABLERO GENERAL"

3. type
Determina el tipo del tablero usando:
- nombre,
- descripción,
- cargas conectadas,
- etiquetas visibles.

Ejemplos válidos:
- "TABLERO GENERAL"
- "TABLERO DISTRIBUCION"
- "TABLERO ESTABILIZADO"
- "TABLERO FUERZA"
- "TABLERO ALUMBRADO"
- "TABLERO CONTROL"
- "TABLERO CUSTOMER CENTER"

Si no es claro:
"type": "NO_IDENTIFICADO"

4. tensionNominal
Extrae:
- 220
- 380
- 440
- 480
etc.

Si aparece:
"380V"
"380 V"
"3x380/220V"

entonces:
tensionNominal = 380

5. numeroFases
Determina:
- 1
- 2
- 3

Reglas:
- "1Ø" => 1
- "3Ø" => 3
- trifásico => 3
- monofásico => 1

6. incluyeNeutro
Debe ser TRUE si aparece:
- "+ N"
- "(N)"
- neutro
- conductor neutro

Caso contrario FALSE.

7. sistema
Determina:
- "MONOFASICO"
- "TRIFASICO"

Reglas:
- 3 fases => TRIFASICO
- 1 fase => MONOFASICO

8. location
Extrae ubicación física o sector.

Ejemplos:
- "SECTOR E"
- "SALA ELECTRICA"
- "CUARTO TECNICO"
- "PISO 2"

Si no existe:
null

9. description
Genera una descripción técnica breve usando SOLO información visible.

Ejemplo:
"Tablero general trifásico 380V del sector E."

10. circuits

Extrae TODOS los circuitos visibles del tablero.

IMPORTANTE:
Debes identificar:
- IG (interruptor general)
- C1
- C2
- C3
- C4
- etc.

TODOS deben incluirse en el array circuits.

La extracción debe seguir el flujo eléctrico visual del diagrama:
interruptor principal -> barras -> derivaciones.

Cada circuito debe contener:

- circuito
- description
- tipo

REGLAS:

1. circuito
Corresponde al identificador visible:
- IG
- C1
- C2
- C3
- etc.

2. description
Corresponde EXACTAMENTE al nombre de la carga o tablero alimentado por ese circuito.

Ejemplos:
- TABLERO ESTABILIZADO CUSTOMER CENTER (TS-CC)
- TABLERO CUSTOMER CENTER (T-CC)
- TAB. OFICINAS
- TV.SS.
- RESERVA

NO dejar vacío description si existe texto asociado al circuito.

3. tipo

Inferir:
- TRIFASICO
- MONOFASICO
- null

REGLAS:
- breaker "3x" => TRIFASICO
- presencia de 3 fases => TRIFASICO
- 1P => MONOFASICO

4. INTERRUPTOR GENERAL (IG)

Si existe un breaker principal antes de las derivaciones, debe registrarse como circuito "IG".

Para el circuito IG:
- circuito: "IG"
- descripcion: "Interruptor General"
- tipo: según el sistema del tablero

REGLA OBLIGATORIA:
La descripcion de IG NUNCA debe contener:
- nombre del tablero
- alimentador de entrada
- textos de cables
- barras
- neutro
- tierra
- lista de circuitos derivados
- cargas como C1, C2, C3, etc.

Ejemplo correcto:
{
  "circuito": "IG",
  "descripcion": "Interruptor General",
  "tipo": "TRIFASICO"
}

Ejemplo incorrecto:
{
  "circuito": "IG",
  "descripcion": "TABLERO TG-SE / TAB. ADOSADO 380V / viene del TGN-1 / C1 / C2..."
}

5. ORDEN

Los circuitos deben devolverse EXACTAMENTE en el orden visual:
IG -> C1 -> C2 -> C3 ...

6. CIRCUITOS RESERVA

"RESERVA" también cuenta como circuito válido y debe incluirse.

7. NO OMITIR CIRCUITOS

Aunque un circuito:
- no tenga breaker visible,
- tenga texto parcial,
- tenga baja resolución,
- o esté incompleto,

igual debe incluirse si es identificable.

11. warnings
Agrega advertencias SOLO si:
- texto ilegible,
- información ambigua,
- circuito parcialmente visible,
- tensión dudosa,
- datos contradictorios.

Si todo es claro:
[]

IMPORTANTE:
- Extrae TODOS los circuitos aunque algunos estén como RESERVA.
- "RESERVA" también es un circuito válido.
- Mantén nombres exactamente como aparecen.
- No traduzcas texto.
- No normalices etiquetas.
`,
            },
            {
                role: "user",
                content: [
                    {
                        type: "input_text",
                        text: `
Analiza este diagrama unifilar industrial.

El código interno del tablero obtenido desde el archivo es:
${boardCode}

Debes extraer toda la información eléctrica visible del tablero principal y sus circuitos derivados.

Prioriza:
1. Nombre del tablero
2. Tensión
3. Sistema eléctrico
4. Número de fases
5. Neutro
6. Circuitos
7. Descripción técnica
8. Ubicación o sector

Devuelve únicamente JSON válido.
`,
                    },
                    {
                        type: "input_image",
                        image_url: imageDataUrl,
                        detail: "high",
                    },
                ],
            },
        ],
        text: {
            format: {
                type: "json_schema",
                name: "board_unifilar_extraction",
                strict: true,
                schema: boardUnifilarSchema,
            },
        },
        max_output_tokens: 4000,
        store: false,
    });

    return JSON.parse(response.output_text);
};

const normalizeCircuits = (circuits = [], sistema = null) => {
  const cleanCircuits = circuits
    .filter((c) => c?.circuito)
    .map((c) => {
      const circuito = c.circuito.trim().toUpperCase();

      return {
        circuito,
        descripcion:
          circuito === "IG"
            ? "Interruptor General"
            : c.descripcion || c.description || "",
        tipo: c.tipo || null,
      };
    });

  const hasIG = cleanCircuits.some((c) => c.circuito === "IG");

  if (!hasIG) {
    cleanCircuits.unshift({
      circuito: "IG",
      descripcion: "Interruptor General",
      tipo: sistema || null,
    });
  }

  return cleanCircuits;
};

export const importBoardsFromUnifilarZip = async (req, res) => {
    try {
        const { companyCode } = req.body;

        if (!companyCode) {
            return res.status(400).json({
                ok: false,
                error: "Debes enviar companyCode.",
            });
        }

        const company = await Company.findOne({ publicCode: companyCode });

        if (!company) {
            return res.status(404).json({
                ok: false,
                error: `No existe una empresa con publicCode: ${companyCode}`,
            });
        }

        if (!req.file) {
            return res.status(400).json({
                ok: false,
                error: "Debes subir un archivo ZIP en el campo file.",
            });
        }

        const zip = new AdmZip(req.file.buffer);
        const entries = zip.getEntries();

        const imageEntries = entries.filter((entry) => {
            if (entry.isDirectory) return false;

            const ext = path.extname(entry.entryName).toLowerCase();

            return [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
        });

        if (imageEntries.length === 0) {
            return res.status(400).json({
                ok: false,
                error: "El ZIP no contiene imágenes válidas.",
            });
        }

        const results = [];

        for (const entry of imageEntries) {
            const originalName = path.basename(entry.entryName);
            const boardCode = getBoardCodeFromFileName(originalName);
            const mimetype = getMimeTypeFromFileName(originalName);
            const buffer = entry.getData();

            try {
                const exists = await Board.findOne({
                    boardCode,
                    companyPublicCode: companyCode,
                });

                if (exists) {
                    results.push({
                        file: originalName,
                        boardCode,
                        status: "skipped",
                        error: "Ya existe un tablero con ese código.",
                    });
                    continue;
                }

                const aiResult = await analyzeUnifilarWithOpenAI({
                    buffer,
                    mimetype,
                    boardCode,
                });

                const imageUrl = await uploadBufferToCloudinary(
                    buffer,
                    boardCode,
                    originalName,
                );

                const board = await Board.create({
                    code: uuidv4(),

                    boardCode,
                    name: aiResult.name || boardCode,
                    type: aiResult.type || "No identificado",
                    location: aiResult.location || "",
                    description: aiResult.description || "",

                    companyPublicCode: companyCode,

                    tensionNominal: aiResult.tensionNominal,
                    numeroFases: aiResult.numeroFases,
                    incluyeNeutro: aiResult.incluyeNeutro ?? false,
                    sistema: aiResult.sistema,

                    circuits: normalizeCircuits(aiResult.circuits, aiResult.sistema),

                    unifilarImage: imageUrl,
                    rawAiUnifilarResponse: aiResult,

                    status: "PENDING_REVIEW",
                    createdBy:
                        req.user?._id || "ID_REAL_DE_USUARIO_PARA_PRUEBAS",
                });

                results.push({
                    file: originalName,
                    boardCode,
                    status: "created",
                    boardId: board._id,
                    warnings: aiResult.warnings || [],
                });
            } catch (error) {
                results.push({
                    file: originalName,
                    boardCode,
                    status: "failed",
                    error: error.message,
                });
            }
        }

        return res.status(201).json({
            ok: true,
            total: imageEntries.length,
            created: results.filter((r) => r.status === "created").length,
            skipped: results.filter((r) => r.status === "skipped").length,
            failed: results.filter((r) => r.status === "failed").length,
            results,
        });
    } catch (error) {
        console.error("Error importando ZIP de unifilares:", error);

        return res.status(500).json({
            ok: false,
            error: error.message || "Error importando ZIP de unifilares.",
        });
    }
};
