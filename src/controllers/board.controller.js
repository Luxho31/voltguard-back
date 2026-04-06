import Board from "../models/Board.js";
import Company from "../models/Company.js";
import { v4 as uuidv4 } from "uuid";

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
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        message: "Los campos name y type son obligatorios",
      });
    }

    if (
      tensionNominal === undefined ||
      numeroFases === undefined ||
      incluyeNeutro === undefined
    ) {
      return res.status(400).json({
        message:
          "Los campos tensionNominal, numeroFases e incluyeNeutro son obligatorios",
      });
    }

    if (!req.user) {
      return res.status(401).json({ message: "No autorizado" });
    }

    if (!companyPublicCode) {
      return res.status(400).json({
        message: "Debes haber seleccionado una empresa",
      });
    }

    const company = await Company.findOne({ publicCode: companyPublicCode });

    if (!company) {
      return res.status(404).json({ message: "Empresa no encontrada" });
    }

    const board = await Board.create({
      code: uuidv4(),
      name: name.trim(),
      type: type.trim(),
      tensionNominal: Number(tensionNominal),
      numeroFases: Number(numeroFases),
      incluyeNeutro:
        incluyeNeutro === true || incluyeNeutro === "true",
      location: location?.trim() || "",
      description: description?.trim() || "",
      images: [],
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

// ✅ Obtener tableros de una empresa por publicCode
export const getCompanyBoards = async (req, res) => {
  try {
    const { publicCode } = req.params;

    if (!publicCode) {
      return res.status(400).json({
        message: "Debes haber seleccionado una empresa",
      });
    }

    const company = await Company.findOne({ publicCode });

    if (!company) {
      return res.status(404).json({ message: "Empresa no encontrada" });
    }

    const boards = await Board.find({ companyPublicCode: publicCode })
      .populate("createdBy", "firstname lastname email")
      .sort({ createdAt: -1 });

    return res.json({
      company: {
        name: company.name,
        publicCode: company.publicCode,
      },
      boards: boards.map((board) => ({
        ...board.toObject(),
        company: {
          name: company.name,
          publicCode: company.publicCode,
        },
      })),
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

    const board = await Board.findOne({
      code,
      companyPublicCode: publicCode,
    }).populate("createdBy", "firstname lastname email");

    if (!board) {
      return res.status(404).json({
        message: "Tablero no encontrado o no pertenece a la empresa indicada",
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
      images,
    } = req.body;

    const { publicCode, code } = req.params;

    if (!req.user) {
      return res.status(401).json({ message: "No autorizado" });
    }

    if (!publicCode) {
      return res.status(400).json({
        message: "Debes indicar el publicCode de la empresa",
      });
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
      return res.status(404).json({
        message: "Tablero no encontrado o no pertenece a la empresa indicada",
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ message: "El nombre no puede estar vacío" });
      }
      board.name = name.trim();
    }

    if (type !== undefined) {
      if (!type.trim()) {
        return res.status(400).json({ message: "El tipo no puede estar vacío" });
      }
      board.type = type.trim();
    }

    if (tensionNominal !== undefined) board.tensionNominal = Number(tensionNominal);
    if (numeroFases !== undefined) board.numeroFases = Number(numeroFases);
    if (incluyeNeutro !== undefined) {
      board.incluyeNeutro = incluyeNeutro === true || incluyeNeutro === "true";
    }
    if (location !== undefined) board.location = location.trim();
    if (description !== undefined) board.description = description.trim();
    if (images !== undefined) board.images = Array.isArray(images) ? images : [];

    await board.save();

    return res.json({
      message: "Tablero actualizado correctamente",
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
      message: "Error al actualizar tablero",
      error: error.message,
    });
  }
};

// ✅ Eliminar tablero
export const deleteBoard = async (req, res) => {
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

    const board = await Board.findOneAndDelete({
      code,
      companyPublicCode: publicCode,
    });

    if (!board) {
      return res.status(404).json({
        message: "Tablero no encontrado o no pertenece a la empresa indicada",
      });
    }

    return res.json({ message: "Tablero eliminado correctamente" });
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
        "code name type tensionNominal numeroFases incluyeNeutro location description images createdAt companyPublicCode"
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
      name: board.name,
      type: board.type,
      tensionNominal: board.tensionNominal,
      numeroFases: board.numeroFases,
      incluyeNeutro: board.incluyeNeutro,
      location: board.location,
      description: board.description,
      images: board.images,
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