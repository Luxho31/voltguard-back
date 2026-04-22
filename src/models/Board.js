import mongoose from "mongoose";

// =========================
// 🔌 CIRCUITS
// =========================
const circuitSchema = new mongoose.Schema(
    {
        circuito: {
            type: String,
            required: true,
            trim: true,
        },
        descripcion: {
            type: String,
            trim: true,
            default: "",
        },
        amperaje: {
            type: Number,
            default: null,
        },
        fase: {
            type: String,
            enum: ["R", "S", "T", null],
            default: null,
        },
        tipo: {
            type: String,
            enum: ["MONOFASICO", "TRIFASICO", null],
            default: null,
        },
        estado: {
            type: String,
            enum: ["ACTIVO", "INACTIVO", "FALLA"],
            default: "ACTIVO",
        },
    },
    { _id: false },
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
            required: true,
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

        // MAIN BREAKER
        mainBreaker: {
            amperaje: { type: Number },
            polos: { type: Number },
            marca: { type: String, trim: true },
            modelo: { type: String, trim: true },
        },

        // PROTECCIÓN
        proteccion: {
            sobretension: { type: Boolean, default: false },
            marca: { type: String, trim: true },
            modelo: { type: String, trim: true },
        },

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

        // USUARIO
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
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
