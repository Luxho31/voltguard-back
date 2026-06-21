import mongoose from "mongoose";

// =========================
// 🔌 CIRCUITS
// =========================
const circuitSchema = new mongoose.Schema(
    {
        circuito: {
            type: String,
            // required: true, // HABILITAR DESPUES
            trim: true,
        },
        descripcion: {
            type: String,
            trim: true,
            default: "",
        },
        tipo: {
            type: String,
            enum: ["MONOFASICO", "TRIFASICO", null],
            default: null,
        },
    },
    { _id: false },
);

// =========================
// 🧪 INSULATION MEASUREMENTS
// =========================
// =========================
// 🧪 INSULATION MEASUREMENTS
// =========================
const insulationMeasurementRowSchema = new mongoose.Schema(
    {
        description: {
            type: String,
            trim: true,
            default: "Barras generales",
        },

        measurement_l1_g: {
            type: Number,
            default: null,
        },

        measurement_l2_g: {
            type: Number,
            default: null,
        },

        measurement_l3_g: {
            type: Number,
            default: null,
        },

        unit: {
            type: String,
            default: "MΩ",
        },
    },
    { _id: false },
);

const insulationMeasurementSchema = new mongoose.Schema(
    {
        batchCode: {
            type: String,
            required: true,
            index: true,
        },
        unit: {
            type: String,
            default: "MΩ",
        },
        status: {
            type: String,
            enum: ["PENDING_REVIEW", "CONFIRMED", "FAILED"],
            default: "PENDING_REVIEW",
        },
        sourceImages: {
            boardImage: {
                type: String,
                default: null,
            },
        },
        rows: {
            type: [insulationMeasurementRowSchema],
            default: [],
        },
        warnings: {
            type: [String],
            default: [],
        },
        rawAiResponse: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        importedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        importedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true },
);

// =========================
// 🧱 BOARD
// =========================
const boardSchema = new mongoose.Schema(
    {
        // ID INTERNO
        code: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        // CÓDIGO REAL DEL TABLERO
        boardCode: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        // INFO BÁSICA
        name: {
            type: String,
            required: true,
            trim: true,
        },

        type: {
            type: String,
            // required: true, // HABILITAR DESPUES
            trim: true,
        },

        // INFO ELÉCTRICA (NO BLOQUEANTE)
        tensionNominal: {
            type: Number,
        },

        numeroFases: {
            type: Number,
        },

        incluyeNeutro: {
            type: Boolean,
            default: false,
        },

        sistema: {
            type: String,
            enum: ["MONOFASICO", "TRIFASICO"],
        },

        // UBICACIÓN
        location: {
            type: String,
            trim: true,
            default: "",
        },

        description: {
            type: String,
            trim: true,
            default: "",
        },

        // // MAIN BREAKER
        // mainBreaker: {
        //     amperaje: { type: Number },
        //     polos: { type: Number },
        //     marca: { type: String, trim: true },
        //     modelo: { type: String, trim: true },
        // },

        // // PROTECCIÓN
        // proteccion: {
        //     sobretension: { type: Boolean, default: false },
        //     marca: { type: String, trim: true },
        //     modelo: { type: String, trim: true },
        // },

        // CIRCUITOS
        circuits: {
            type: [circuitSchema],
            default: [],
        },

        // IMÁGENES
        images: {
            tablero: {
                type: [String],
                default: [],
            },
            unifilar: {
                type: [String],
                default: [],
            },
            termografia: {
                type: [String],
                default: [],
            },
        },

        // MEDICIONES DE AISLAMIENTO
        insulationMeasurements: {
            type: [insulationMeasurementSchema],
            default: [],
        },

        // ESTADO
        estadoGeneral: {
            type: String,
            enum: ["OPERATIVO", "OBSERVACION", "CRITICO"],
        },

        // EMPRESA (CLAVE)
        companyPublicCode: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },

        /***************** NFPA 70E SECTION *****************/
        // nfpa: {
        //     // --- Campos Técnicos de Entrada (Reales o Inferidos) ---
        //     amperajePrincipal: {
        //         type: Number,
        //         default: null, // Guardamos el amperaje detectado en el plano (ej. 250)
        //     },
        //     tipoInterruptor: {
        //         type: String,
        //         default: "Caja Moldeada", // Almacena el resultado final (Caja Moldeada, Riel DIN, Caja Abierta)
        //     },
        //     corrienteCortocircuito: {
        //         type: Number,
        //         default: null, // Guardamos el kA (ej. 22) inferido o leído
        //     },
        //     distanciaTrabajo: {
        //         type: String,
        //         default: "45.72 cm (18 in)", // Fijo por defecto para baja tensión
        //     },

        //     // --- Campos de Salida Calculados por la IA / Norma ---
        //     distanciaArco: {
        //         type: String, // Cambiado a String para guardar unidad ej: "0.74 m"
        //         default: "",
        //     },
        //     energiaIncidente: {
        //         type: String, // Cambiado a String para guardar unidad ej: "3.13 cal/cm²"
        //         default: "",
        //     },
        //     categoriaRiesgo: {
        //         type: Number, // 1, 2, 3 o 4
        //         default: null,
        //     },
        //     limiteAproximacion: {
        //         type: String, // Unidades métricas ej: "1.07 m"
        //         default: "",
        //     },
        //     distanciaRestringida: {
        //         type: String, // Unidades métricas ej: "0.31 m"
        //         default: "",
        //     },
        //     guantesClase: {
        //         type: String, // Ej: "Clase 00 Protección con guantes de piel"
        //         default: "",
        //     },

        //     // --- Dataset de EPP Ordenado de Cabeza a Pies ---
        //     eppRequerido: {
        //         type: [String], // Un array de strings directo es más limpio y rápido de renderizar en tu listado
        //         default: [],
        //     },

        //     // --- Control de Flujo Automático ---
        //     calculadoPorIA: {
        //         type: Boolean,
        //         default: false,
        //     },
        // },

        /***************** NFPA 70E SECTION *****************/
        nfpa: {
            type: {
                amperajePrincipal: { type: Number, default: null },
                tipoInterruptor: { type: String, default: "Caja Moldeada" },
                corrienteCortocircuito: { type: Number, default: null },
                distanciaTrabajo: { type: String, default: "45.72 cm (18 in)" },
                distanciaArco: { type: String, default: "" },
                energiaIncidente: { type: String, default: "" },
                categoriaRiesgo: { type: Number, default: null },
                limiteAproximacion: { type: String, default: "" },
                distanciaRestringida: { type: String, default: "" },
                guantesClase: { type: String, default: "" },
                eppRequerido: { type: [String], default: [] },
                calculadoPorIA: { type: Boolean, default: false },
            },
            default: undefined // 👈 ESTA LINEA EVITA QUE MONGOOSE LO CREA POR DEFECTO
        },
        
        /************************************************** */

        // USUARIO
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        
        assignedDocuments: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Document"
            }
        ]
    },
    {
        timestamps: true,
    },
);

// =========================
// 🔒 UNIQUE COMBINADO
// =========================
boardSchema.index({ boardCode: 1, companyPublicCode: 1 }, { unique: true });

export default mongoose.model("Board", boardSchema);
