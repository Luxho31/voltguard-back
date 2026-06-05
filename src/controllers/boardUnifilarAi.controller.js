import path from "path";
import { v4 as uuidv4 } from "uuid";

import openai from "../config/openai.js";
import cloudinary from "../config/cloudinary.js";
import Board from "../models/Board.js";
import Company from "../models/Company.js";
import AdmZip from "adm-zip";

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

const getImageKindFromFileName = (filename) => {
  const name = filename.toLowerCase();

  if (name.includes("unifilar")) {
    return "unifilar";
  }

  if (
    name.includes("_itm") ||
    name.includes("interruptor") ||
    name.includes("breaker")
  ) {
    return "itm";
  }

  if (
    name.includes("termografia") ||
    name.includes("termica")
  ) {
    return "termografia";
  }

  return "tablero";
};

const getBoardCodeFromGroupedImage = (filename) => {
    return path.parse(filename).name.split("_")[0].trim().toUpperCase();
};

const uploadBoardImageToCloudinary = async ({
    buffer,
    boardCode,
    originalName,
    kind,
}) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: `boards/${boardCode}/${kind}`,
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

// -------------

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

        "mainBreakerAmperage", 
        "mainBreakerSigla",

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

        mainBreakerAmperage: { type: ["number", "null"] }, // <-- NUEVO
        mainBreakerSigla: { type: ["string", "null"] },    // <-- NUEVO (Ej: "MCCB", "ACB")

        warnings: {
            type: "array",
            items: { type: "string" },
        },
    },
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
    "warnings"
  ],

  properties: {
    manufacturer: {
      type: ["string", "null"]
    },

    model: {
      type: ["string", "null"]
    },

    amperage: {
      type: ["number", "null"]
    },

    voltage: {
      type: ["number", "null"]
    },

    breakingCapacityKA: {
      type: ["number", "null"]
    },

    breakerType: {
      type: ["string", "null"]
    },

    warnings: {
      type: "array",
      items: {
        type: "string"
      }
    }
  }
};

const analyzeITMWithOpenAI = async ({
  images,
  boardCode,
}) => {

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

No inventes datos.

Si no se ve:
null

Devuelve únicamente JSON.
`
    }
  ];

  for (const img of images) {

    const imageDataUrl = bufferToDataUrl(
      img.buffer,
      img.mimetype
    );

    content.push({
      type: "input_image",
      image_url: imageDataUrl,
      detail: "high",
    });
  }

  const response =
    await openai.responses.create({

      model:
        process.env.OPENAI_MODEL ||
        "gpt-4.1-mini",

      input: [
        {
          role: "user",
          content,
        },
      ],

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

  return JSON.parse(
    response.output_text
  );
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

Extrae la tensión nominal principal visible del tablero.

Ejemplos:
- 220V => 220
- 380V => 380
- 400V => 400
- 440V => 440
- 480V => 480
- 3x380/220V => 380

Si existen varias tensiones:
prioriza la tensión principal del tablero.

Si no puede determinarse:
null


4.1 mainBreakerAmperage / mainBreakerSigla
Busca el interruptor general (IG) o el interruptor principal que está en la cabecera del diagrama.
- Extrae en "mainBreakerAmperage" solo el número del amperaje nominal (ej. si dice 3x250A o IN=250A, devuelve 250).
- Extrae en "mainBreakerSigla" el tipo de tecnología si viene escrita (ej. "MCCB", "ACB", "MCB"). Si no viene ninguna sigla pero dice "Caja Moldeada" o "Riel DIN", coloca la sigla equivalente. Si no hay datos, usa null.



5. numeroFases / sistema / neutro

Debes determinar correctamente si el tablero es MONOFASICO o TRIFASICO.

=========================
TABLERO MONOFÁSICO
=========================

El tablero es MONOFASICO si aparece cualquiera de estas señales:

- "1Ø"
- "1F"
- "1 fase"
- "1x"
- "F+N"
- "L+N"
- "fase y neutro"
- "2 hilos"
- breaker 1P
- una sola línea de fase
- tensión 220V sin presencia de tres fases

En ese caso devuelve:

numeroFases: 1
sistema: "MONOFASICO"

=========================
TABLERO TRIFÁSICO
=========================

El tablero es TRIFASICO si aparece cualquiera de estas señales:

- "3Ø"
- "3F"
- "3 fases"
- "3x"
- "R S T"
- "L1 L2 L3"
- "R S T N"
- breaker 3P
- tres líneas de fase
- tensión 380V
- tensión 400V
- tensión 440V
- tensión 480V

En ese caso devuelve:

numeroFases: 3
sistema: "TRIFASICO"

=========================
REGLA IMPORTANTE SOBRE 220V
=========================

220V NO significa automáticamente TRIFASICO.

- Si solo aparece una fase + neutro => MONOFASICO
- Si aparecen tres fases => TRIFASICO

=========================
incluyeNeutro
=========================

Debe ser TRUE si aparece:

- N
- +N
- (N)
- F+N
- L+N
- neutro

Caso contrario FALSE.

=========================
REGLAS IMPORTANTES
=========================

- No asumir TRIFASICO por defecto.
- Si el tablero parece residencial o pequeño y usa F+N, probablemente es MONOFASICO.
- Si existen dudas, usa warnings.
- Prioriza siempre el diagrama eléctrico por encima del texto descriptivo.

6. location
Extrae ubicación física o sector.

Ejemplos:
- "SECTOR E"
- "SALA ELECTRICA"
- "CUARTO TECNICO"
- "PISO 2"

Si no existe:
null

7. description
Genera una descripción técnica breve usando SOLO información visible.

Ejemplo:
"Tablero general trifásico 380V del sector E."

8. circuits

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
- descripcion
- tipo

REGLAS:

1. circuito
Corresponde al identificador visible:
- IG
- C1
- C2
- C3
- etc.

2. descripcion
Corresponde EXACTAMENTE al nombre de la carga o tablero alimentado por ese circuito.

Ejemplos:
- TABLERO ESTABILIZADO CUSTOMER CENTER (TS-CC)
- TABLERO CUSTOMER CENTER (T-CC)
- TAB. OFICINAS
- TV.SS.
- RESERVA

NO dejar vacío descripcion si existe texto asociado al circuito.

3. tipo

Determina el tipo del circuito.

=========================
CIRCUITO MONOFÁSICO
=========================

El circuito es MONOFASICO si:
- aparece 1P
- aparece F+N
- aparece L+N
- aparece 1Ø
- aparece 1x
- existe una sola fase
- carga pequeña residencial
- iluminación o tomacorrientes simples

=========================
CIRCUITO TRIFÁSICO
=========================

El circuito es TRIFASICO si:
- aparece 3P
- aparece 3x
- R,S,T
- L1,L2,L3
- tres fases
- motores
- tableros derivados trifásicos

=========================
REGLA IMPORTANTE
=========================

No asumir TRIFASICO por defecto.

Si no puede determinarse claramente:
tipo = null

4. INTERRUPTOR GENERAL (IG)

Si existe un breaker principal antes de las derivaciones:
- debe registrarse como circuito "IG"

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

9. warnings
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

const generateNfpaData = (unifilarData, itmData = null) => {
    const voltage = unifilarData.tensionNominal || itmData?.voltage || 380;
    const amperaje = itmData?.amperage || unifilarData.mainBreakerAmperage || 150;

    // 1. Resolver tipo de interruptor
    let tipoInterruptor = "Caja Moldeada"; 
    const siglaDetectada = (itmData?.breakerType || unifilarData.mainBreakerSigla || "").toUpperCase();

    if (siglaDetectada.includes("MCCB") || siglaDetectada.includes("MOLDEADA")) {
        tipoInterruptor = "Caja Moldeada";
    } else if (siglaDetectada.includes("ACB") || siglaDetectada.includes("AIRE") || siglaDetectada.includes("BASTIDOR")) {
        tipoInterruptor = "Caja Abierta (Bastidor)";
    } else if (siglaDetectada.includes("MCB") || siglaDetectada.includes("MINIATURA") || siglaDetectada.includes("DIN")) {
        tipoInterruptor = "Riel DIN (Miniatura)";
    } else {
        if (amperaje <= 125) {
            tipoInterruptor = "Riel DIN (Miniatura)";
        } else if (amperaje > 1000) {
            tipoInterruptor = "Caja Abierta (Bastidor)";
        }
    }

    // 2. Resolver Cortocircuito (kA)
    let shortCircuitCurrent = 22; 
    if (amperaje <= 125) shortCircuitCurrent = 10;
    else if (amperaje > 125 && amperaje <= 400) shortCircuitCurrent = 22;
    else if (amperaje > 400 && amperaje <= 1000) shortCircuitCurrent = 35;
    else if (amperaje > 1000) shortCircuitCurrent = 50;

    // 3. Determinar los datos de arco basados en rangos (Estructura fija para evitar fallos de scope)
    let arcData = {
        riskCategory: 1,
        incidentEnergy: "3.13 cal/cm²",
        arcDistance: "0.74 m",
        eppRequerido: [
            "Casco de Seguridad de Polímero Tipo E con Careta Facial AR (Mín. 4 cal/cm²)",
            "Lentes de Seguridad de Policarbonato con protección UV",
            "Camisa de manga larga y pantalón de trabajo AR (Mínimo 4 cal/cm² a 8 cal/cm²)",
            "Guantes de Cuero para Trabajo Mecánico o Dieléctricos según corresponda",
            "Zapatos Dieléctricos de Seguridad con puntera de composite"
        ]
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
                "Zapatos Dieléctricos de Seguridad"
            ]
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
                "Botas Dieléctricas de Caña Alta (Hule/Goma)"
            ]
        };
    }

    // 4. Determinar los límites de choque según el Voltaje
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

    // 5. Retorno limpio mapeando el objeto arcData
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
        calculadoPorIA: true
    };
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

        const groupedImages = {};

        for (const entry of imageEntries) {
            const originalName = path.basename(entry.entryName);

            const boardCode = getBoardCodeFromGroupedImage(originalName);

            const kind = getImageKindFromFileName(originalName);

            if (!groupedImages[boardCode]) {
                groupedImages[boardCode] = {
                    boardCode,
                    unifilar: null,
                    itm: [],
                    tablero: [],
                    termografia: [],
                };
            }

            const imageData = {
                entry,
                originalName,
                buffer: entry.getData(),
                mimetype: getMimeTypeFromFileName(originalName),
                kind,
            };

            // if (kind === "unifilar") {
            //     groupedImages[boardCode].unifilar = imageData;
            // } else if (kind === "termografia") {
            //     groupedImages[boardCode].termografia.push(imageData);
            // } else {
            //     groupedImages[boardCode].tablero.push(imageData);
            // }

            // ... (Reemplaza el cierre del bucle for (const entry of imageEntries) por esto)
            if (kind === "unifilar") {
                groupedImages[boardCode].unifilar = imageData;
            } else if (kind === "itm") {
                groupedImages[boardCode].itm.push(imageData); // <-- CAMBIADO: Ahora sí agrupa las fotos del interruptor físico
            } else if (kind === "termografia") {
                groupedImages[boardCode].termografia.push(imageData);
            } else {
                groupedImages[boardCode].tablero.push(imageData);
            }
        }

        const results = [];

        for (const group of Object.values(groupedImages)) {
            const { boardCode } = group;

            try {
                if (!group.unifilar) {
                    results.push({
                        boardCode,
                        status: "failed",
                        error: "No se encontró imagen unifilar para este tablero.",
                    });

                    continue;
                }

                const exists = await Board.findOne({
                    boardCode,
                    companyPublicCode: companyCode,
                });

                if (exists) {
                    results.push({
                        boardCode,
                        status: "skipped",
                        error: "Ya existe un tablero con ese código.",
                    });

                    continue;
                }

                const aiResult = await analyzeUnifilarWithOpenAI({
                    buffer: group.unifilar.buffer,
                    mimetype: group.unifilar.mimetype,
                    boardCode,
                });

                // const images = {
                //     tablero: [],
                //     unifilar: [],
                //     termografia: [],
                // };

                // const allImages = [
                //     group.unifilar,
                //     ...group.tablero,
                //     ...group.termografia,
                // ];

                // for (const img of allImages) {
                //     const url = await uploadBoardImageToCloudinary({
                //         buffer: img.buffer,
                //         boardCode,
                //         originalName: img.originalName,
                //         kind: img.kind,
                //     });

                //     images[img.kind].push(url);
                // }

                // const board = await Board.create({
                //     code: uuidv4(),
                //     boardCode,
                //     name: aiResult.name || boardCode,
                //     type: aiResult.type || "No identificado",
                //     location: aiResult.location || "",
                //     description: aiResult.description || "",
                //     companyPublicCode: companyCode,
                //     tensionNominal: aiResult.tensionNominal,
                //     numeroFases: aiResult.numeroFases,
                //     incluyeNeutro: aiResult.incluyeNeutro ?? false,
                //     sistema: aiResult.sistema,
                //     circuits: normalizeCircuits(
                //         aiResult.circuits,
                //         aiResult.sistema,
                //     ),
                //     images,
                //     estadoGeneral: "OPERATIVO",
                //     createdBy:
                //         req.user?._id || "ID_REAL_DE_USUARIO_PARA_PRUEBAS",
                // });

                // ... (Colocar justo debajo de const aiResult = await analyzeUnifilarWithOpenAI(...))

                // 1. Ejecutar análisis opcional de la foto del interruptor físico si se subió al ZIP
                let itmResult = null;
                if (group.itm && group.itm.length > 0) {
                    try {
                        itmResult = await analyzeITMWithOpenAI({
                            images: group.itm,
                            boardCode
                        });
                    } catch (itmError) {
                        console.error(`Error analizando ITM para ${boardCode}, continuando solo con unifilar...`, itmError);
                    }
                }

                // 2. Generar el payload NFPA 70E automáticamente combinando los dos caminos
                const nfpaCalculatedData = generateNfpaData(aiResult, itmResult);

                // 3. Subida de imágenes a Cloudinary (Agrupamos también el itm en la subida si procede)
                const images = {
                    tablero: [],
                    unifilar: [],
                    termografia: [],
                    itm: [] // Añade itm si tu schema final de imágenes lo soporta
                };

                const allImages = [
                    group.unifilar,
                    ...group.tablero,
                    ...group.termografia,
                    ...group.itm
                ].filter(Boolean);

                for (const img of allImages) {
                    const url = await uploadBoardImageToCloudinary({
                        buffer: img.buffer,
                        boardCode,
                        originalName: img.originalName,
                        kind: img.kind,
                    });
                    
                    if (images[img.kind]) {
                        images[img.kind].push(url);
                    } else {
                        images.tablero.push(url); // Fallback por si acaso
                    }
                }

                // 4. Crear el registro en MongoDB con la data NFPA 70E integrada
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
                    circuits: normalizeCircuits(
                        aiResult.circuits,
                        aiResult.sistema,
                    ),
                    images,
                    estadoGeneral: "OPERATIVO",
                    createdBy: req.user?._id || "ID_REAL_DE_USUARIO_PARA_PRUEBAS",
                    
                    nfpa: nfpaCalculatedData // <-- ENTRADA DE LA DATA GENERADA AUTOMÁTICAMENTE
                });

                // ... (El resto de tu código de inserción "results.push" se queda igual hacia abajo)

                results.push({
                    boardCode,
                    status: "created",
                    boardId: board._id,
                    warnings: aiResult.warnings || [],
                });
            } catch (error) {
                results.push({
                    boardCode,
                    status: "failed",
                    error: error.message,
                });
            }
        }

        return res.status(201).json({
            ok: true,
            total: Object.keys(groupedImages).length,
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
