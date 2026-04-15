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
            location,
            description,
            companyPublicCode,
            leyenda,
        } = req.body;

        if (!name || !type)
            return res
                .status(400)
                .json({ message: "name y type son obligatorios" });

        if (
            tensionNominal === undefined ||
            numeroFases === undefined ||
            incluyeNeutro === undefined
        )
            return res.status(400).json({
                message:
                    "tensionNominal, numeroFases e incluyeNeutro son obligatorios",
            });

        if (!req.user)
            return res.status(401).json({ message: "No autorizado" });

        const company = await Company.findById(companyPublicCode);
        if (!company)
            return res.status(404).json({ message: "Empresa no encontrada" });

        if (!req.body.boardCode) {
            return res.status(400).json({
                message: "boardCode es obligatorio",
            });
        }

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

        let parsedLeyenda = [];

        if (leyenda) {
            parsedLeyenda =
                typeof leyenda === "string" ? JSON.parse(leyenda) : leyenda;
        }

        const board = await Board.create({
            code: uuidv4(),
            boardCode: req.body.boardCode?.trim(),
            name: name.trim(),
            type: type.trim(),
            tensionNominal: Number(tensionNominal),
            numeroFases: Number(numeroFases),
            incluyeNeutro: incluyeNeutro === true || incluyeNeutro === "true",
            location: location?.trim() || "",
            description: description?.trim() || "",
            images,
            leyenda: parsedLeyenda,
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

export const getCompanyBoards = async (req, res) => {
    try {
        let { publicCode } = req.params;

        if (!req.user) {
            return res.status(401).json({ message: "No autorizado" });
        }

        // 🔥 SI ES ADMIN → forzar su empresa
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

        return res.json({
            company,
            boards,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ✅ Obtener un tablero por código y empresa
export const getBoardByCode = async (req, res) => {
    try {
        const { publicCode, code } = req.params;

        if (!publicCode) {
            return res.status(400).json({
                message: "Debes indicar el publicCode de la empresa",
            });
        }

        const company = await Company.findOne({ publicCode });

        if (!company) {
            return res.status(404).json({ message: "Empresa no encontrada" });
        }

        if (req.user.role === "ADMIN") {
            const company = await Company.findById(req.user.company);

            if (company.publicCode !== publicCode) {
                return res.status(403).json({ message: "No autorizado" });
            }
        }

        const board = await Board.findOne({
            code,
            companyPublicCode: publicCode,
        }).populate("createdBy", "firstname lastname email");

        if (!board) {
            return res.status(404).json({
                message:
                    "Tablero no encontrado o no pertenece a la empresa indicada",
            });
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
      name,
      type,
      tensionNominal,
      numeroFases,
      incluyeNeutro,
      location,
      description,
      leyenda, // 🔥 NUEVO

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
    if (name !== undefined) board.name = name.trim();
    if (type !== undefined) board.type = type.trim();
    if (tensionNominal !== undefined)
      board.tensionNominal = Number(tensionNominal);
    if (numeroFases !== undefined)
      board.numeroFases = Number(numeroFases);
    if (incluyeNeutro !== undefined)
      board.incluyeNeutro =
        incluyeNeutro === "true" || incluyeNeutro === true;

    if (location !== undefined) board.location = location;
    if (description !== undefined) board.description = description;

    // =========================
    // 📊 LEYENDA
    // =========================
    if (leyenda !== undefined) {
      board.leyenda =
        typeof leyenda === "string" ? JSON.parse(leyenda) : leyenda;
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
          `boards/${field}`
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
      return res.status(404).json({
        message: "Tablero no encontrado",
      });
    }

    // =========================
    // 🗑 ELIMINAR IMÁGENES CLOUDINARY
    // =========================
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
      } catch (err) {
        console.warn("Error eliminando imagen:", err.message);
      }
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
 * 🌐 PÚBLICO / DASHBOARD
 * =========================
 */

// ✅ Obtener tableros por empresa pública
export const publicGetCompanyBoards = async (req, res) => {
    try {
        const { publicCode } = req.params;

        const company = await Company.findOne({ publicCode });

        if (!company) {
            return res.status(404).json({ message: "Empresa no encontrada" });
        }

        const boards = await Board.find({ companyPublicCode: publicCode })
            .select(
                "code name type tensionNominal numeroFases incluyeNeutro location description images createdAt companyPublicCode",
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

// ✅ Obtener un tablero público por código y empresa
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
            code: board.code,
            boardCode: board.boardCode,
            name: board.name,
            type: board.type,
            tensionNominal: board.tensionNominal,
            numeroFases: board.numeroFases,
            incluyeNeutro: board.incluyeNeutro,
            location: board.location,
            description: board.description,
            images: board.images,
            leyenda: board.leyenda || [],
            createdAt: board.createdAt,
            company: {
                name: company.name,
                publicCode: company.publicCode,
            },
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
