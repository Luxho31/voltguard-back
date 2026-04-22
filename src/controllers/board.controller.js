import Board from "../models/Board.js";
import Company from "../models/Company.js";
import { v4 as uuidv4 } from "uuid";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import cloudinary from "../config/cloudinary.js";

/**
 * =========================
 * 🔒 PRIVADO
 * =========================
 */

// ✅ Crear tablero
export const createBoard = async (req, res) => {
    try {
        const {
            name,
            type,
            tensionNominal,
            numeroFases,
            incluyeNeutro,
            sistema,
            estadoGeneral,
            location,
            description,
            boardCode,
            circuits,
            mainBreaker,
            proteccion,
        } = req.body;

        if (!name || !type || !boardCode) {
            return res
                .status(400)
                .json({ message: "name, type y boardCode son obligatorios" });
        }

        if (
            tensionNominal === undefined ||
            numeroFases === undefined ||
            incluyeNeutro === undefined
        ) {
            return res.status(400).json({
                message:
                    "tensionNominal, numeroFases e incluyeNeutro son obligatorios",
            });
        }

        if (!req.user) {
            return res.status(401).json({ message: "No autorizado" });
        }

        const company = await Company.findOne({
            publicCode: req.body.companyPublicCode,
        });

        if (!company) {
            return res.status(404).json({ message: "Empresa no encontrada" });
        }

        // =========================
        // 🖼 IMÁGENES
        // =========================
        const imageFields = ["tablero", "unifilar", "termografia"];

        const images = {
            tablero: [],
            unifilar: [],
            termografia: [],
        };

        for (const field of imageFields) {
            const files = req.files?.[field] || [];

            for (const file of files) {
                const { url } = await uploadToCloudinary(
                    file.buffer,
                    `boards/${field}`,
                );
                images[field].push(url);
            }
        }

        // =========================
        // ⚡ CIRCUITS
        // =========================
        let parsedCircuits = [];

        if (circuits) {
            parsedCircuits =
                typeof circuits === "string" ? JSON.parse(circuits) : circuits;
        }

        const board = await Board.create({
            code: uuidv4(),
            boardCode: boardCode.trim(),
            name: name.trim(),
            type: type.trim(),
            tensionNominal: Number(tensionNominal),
            numeroFases: Number(numeroFases),
            incluyeNeutro: incluyeNeutro === true || incluyeNeutro === "true",
            sistema,
            estadoGeneral,
            location: location?.trim() || "",
            description: description?.trim() || "",
            circuits: parsedCircuits,
            mainBreaker:
                typeof mainBreaker === "string"
                    ? JSON.parse(mainBreaker)
                    : mainBreaker,
            proteccion:
                typeof proteccion === "string"
                    ? JSON.parse(proteccion)
                    : proteccion,
            images,
            companyPublicCode: company.publicCode,
            createdBy: req.user._id,
        });

        return res.status(201).json({
            message: "Tablero creado correctamente",
            board: {
                ...board.toObject(),
                company: {
                    name: company.name,
                    publicCode: company.publicCode,
                },
            },
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error al crear tablero",
            error: error.message,
        });
    }
};

// ✅ Obtener tableros por empresa
export const getCompanyBoards = async (req, res) => {
    try {
        let { publicCode } = req.params;

        if (!req.user) {
            return res.status(401).json({ message: "No autorizado" });
        }

        if (req.user.role === "ADMIN") {
            const company = await Company.findById(req.user.company);
            if (!company) {
                return res
                    .status(404)
                    .json({ message: "Empresa no encontrada" });
            }
            publicCode = company.publicCode;
        }

        const company = await Company.findOne({ publicCode });
        if (!company) {
            return res.status(404).json({ message: "Empresa no encontrada" });
        }

        const boards = await Board.find({
            companyPublicCode: publicCode,
        });

        return res.json({ company, boards });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ✅ Obtener tablero por código
export const getBoardByCode = async (req, res) => {
    try {
        const { publicCode, code } = req.params;

        const company = await Company.findOne({ publicCode });
        if (!company) {
            return res.status(404).json({ message: "Empresa no encontrada" });
        }

        if (req.user.role === "ADMIN") {
            const userCompany = await Company.findById(req.user.company);
            if (userCompany.publicCode !== publicCode) {
                return res.status(403).json({ message: "No autorizado" });
            }
        }

        const board = await Board.findOne({
            code,
            companyPublicCode: publicCode,
        }).populate("createdBy", "firstname lastname email");

        if (!board) {
            return res.status(404).json({ message: "Tablero no encontrado" });
        }

        return res.json({
            ...board.toObject(),
            company: {
                name: company.name,
                publicCode: company.publicCode,
            },
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error al obtener tablero",
            error: error.message,
        });
    }
};

// ✅ Actualizar tablero
export const updateBoard = async (req, res) => {
    try {
        const {
            boardCode,
            name,
            type,
            tensionNominal,
            numeroFases,
            incluyeNeutro,
            sistema,
            estadoGeneral,
            location,
            description,
            circuits,
            mainBreaker,
            proteccion,
            existingUnifilar,
            existingTablero,
            existingTermografia,
        } = req.body;

        const { publicCode, code } = req.params;

        if (!req.user) {
            return res.status(401).json({ message: "No autorizado" });
        }

        const company = await Company.findOne({ publicCode });
        if (!company) {
            return res.status(404).json({ message: "Empresa no encontrada" });
        }

        const board = await Board.findOne({
            code,
            companyPublicCode: publicCode,
        });

        if (!board) {
            return res.status(404).json({ message: "Tablero no encontrado" });
        }

        // =========================
        // 🧾 DATOS
        // =========================
        if (boardCode !== undefined) board.boardCode = boardCode.trim();
        if (name !== undefined) board.name = name.trim();
        if (type !== undefined) board.type = type.trim();
        if (tensionNominal !== undefined)
            board.tensionNominal = Number(tensionNominal);
        if (numeroFases !== undefined) board.numeroFases = Number(numeroFases);
        if (incluyeNeutro !== undefined)
            board.incluyeNeutro =
                incluyeNeutro === "true" || incluyeNeutro === true;
        if (sistema !== undefined) board.sistema = sistema;
        if (estadoGeneral !== undefined) board.estadoGeneral = estadoGeneral;
        if (location !== undefined) board.location = location;
        if (description !== undefined) board.description = description;

        if (circuits !== undefined) {
            board.circuits =
                typeof circuits === "string" ? JSON.parse(circuits) : circuits;
        }

        if (mainBreaker !== undefined) {
            board.mainBreaker =
                typeof mainBreaker === "string"
                    ? JSON.parse(mainBreaker)
                    : mainBreaker;
        }

        if (proteccion !== undefined) {
            board.proteccion =
                typeof proteccion === "string"
                    ? JSON.parse(proteccion)
                    : proteccion;
        }

        // =========================
        // 🖼 IMÁGENES
        // =========================
        const parseArray = (data) => {
            if (!data) return [];
            return Array.isArray(data) ? data : JSON.parse(data);
        };

        const parsedExisting = {
            unifilar: parseArray(existingUnifilar),
            tablero: parseArray(existingTablero),
            termografia: parseArray(existingTermografia),
        };

        const imageFields = ["unifilar", "tablero", "termografia"];

        for (const field of imageFields) {
            const files = req.files?.[field] || [];

            const uploaded = [];

            for (const file of files) {
                const { url } = await uploadToCloudinary(
                    file.buffer,
                    `boards/${field}`,
                );
                uploaded.push(url);
            }

            board.images[field] = [...parsedExisting[field], ...uploaded];
        }

        await board.save();

        return res.json({
            message: "Tablero actualizado correctamente",
            board,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error al actualizar tablero",
            error: error.message,
        });
    }
};

// ✅ Eliminar tablero
export const deleteBoard = async (req, res) => {
    try {
        const { publicCode, code } = req.params;

        const company = await Company.findOne({ publicCode });
        if (!company) {
            return res.status(404).json({ message: "Empresa no encontrada" });
        }

        const board = await Board.findOne({
            code,
            companyPublicCode: publicCode,
        });

        if (!board) {
            return res.status(404).json({ message: "Tablero no encontrado" });
        }

        const extractPublicId = (url) => {
            const parts = url.split("/");
            const file = parts[parts.length - 1];
            return `boards/${file.split(".")[0]}`;
        };

        const allImages = [
            ...(board.images?.tablero || []),
            ...(board.images?.unifilar || []),
            ...(board.images?.termografia || []),
        ];

        for (const url of allImages) {
            try {
                const publicId = extractPublicId(url);
                await cloudinary.uploader.destroy(publicId);
            } catch (err) {}
        }

        await board.deleteOne();

        return res.json({
            message: "Tablero eliminado correctamente",
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * =========================
 * 🌐 PÚBLICO
 * =========================
 */

export const publicGetCompanyBoards = async (req, res) => {
    try {
        const { publicCode } = req.params;

        const company = await Company.findOne({ publicCode });
        if (!company) {
            return res.status(404).json({ message: "Empresa no encontrada" });
        }

        const boards = await Board.find({ companyPublicCode: publicCode })
            .select(
                "code boardCode name type tensionNominal numeroFases incluyeNeutro location description images createdAt",
            )
            .sort({ createdAt: -1 });

        return res.json({
            company: {
                name: company.name,
                publicCode: company.publicCode,
            },
            boards,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const publicGetCompanyBoardByCode = async (req, res) => {
    try {
        const { publicCode, code } = req.params;

        const company = await Company.findOne({ publicCode });
        if (!company) {
            return res.status(404).json({ message: "Empresa no encontrada" });
        }

        const board = await Board.findOne({
            code,
            companyPublicCode: publicCode,
        });

        if (!board) {
            return res.status(404).json({ message: "Tablero no encontrado" });
        }

        return res.json({
            ...board.toObject(),
            company: {
                name: company.name,
                publicCode: company.publicCode,
            },
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
