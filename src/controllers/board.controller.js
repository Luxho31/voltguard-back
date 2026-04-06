import Board from "../models/Board.js";
import Company from "../models/Company.js";
import { v4 as uuidv4 } from "uuid";

/**
 * =========================
 * 🔒 PRIVADO (ADMIN)
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
      company: companyId
      // images,
    } = req.body;

    // Validaciones básicas
    if (!name || !type) {
      return res.status(400).json({
        message: "Los campos name y type son obligatorios",
      });
    }

    if (tensionNominal === undefined || numeroFases === undefined || incluyeNeutro === undefined) {
      return res.status(400).json({
        message:
          "Los campos tensionNominal, numeroFases e incluyeNeutro son obligatorios",
      });
    }

    if (!req.user) {
      return res.status(401).json({ message: "No autorizado" });
    }

    // if (!req.user.company) {
    //   return res.status(400).json({
    //     message: "El usuario no tiene empresa asignada",
    //   });
    // }

    // const company = await Company.findOne({ publicCode: req.user.company });
    // const company = await Company.findById(req.user.company);

    if (!companyId) {
  return res.status(400).json({
    message: "La empresa es obligatoria",
  });
}

const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({ message: "Empresa no encontrada" });
    }

    const board = await Board.create({
      code: uuidv4(),
      name: name.trim(),
      type: type.trim(),
      tensionNominal: Number(tensionNominal),
      numeroFases: Number(numeroFases),
      incluyeNeutro: Boolean(incluyeNeutro),
      location: location?.trim() || "",
      description: description?.trim() || "",
      images: [],
      company: company._id, // ✅ FIX
      createdBy: req.user._id, // mejor usar _id
    });

    return res.status(201).json({
      message: "Tablero creado correctamente",
      board,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al crear tablero",
      error: error.message,
    });
  }
};

// ✅ Obtener tableros de la empresa del admin
export const getCompanyBoards = async (req, res) => {
  try {
    const company = await Company.findOne({ publicCode: req.user.company });

    if (!company) {
      return res.status(404).json({ message: "Empresa no encontrada" });
    }

    const boards = await Board.find({ company: company._id })
      .populate("company", "name publicCode")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.json(boards);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ✅ Obtener un tablero por código (solo si pertenece a su empresa)
export const getCompanyBoardByCode = async (req, res) => {
  try {
    const company = await Company.findOne({ publicCode: req.user.company });

    if (!company) {
      return res.status(404).json({ message: "Empresa no encontrada" });
    }

    const board = await Board.findOne({
      code: req.params.code,
      company: company._id,
    })
      .populate("company", "name publicCode")
      .populate("createdBy", "name email");

    if (!board) {
      return res.status(404).json({ message: "Tablero no encontrado" });
    }

    return res.json(board);
  } catch (error) {
    return res.status(500).json({ message: error.message });
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

    if (!req.user) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const company = await Company.findOne({ publicCode: req.user.company });

    if (!company) {
      return res.status(404).json({ message: "Empresa no encontrada" });
    }

    const board = await Board.findOne({
      code: req.params.code,
      company: company._id,
    });

    if (!board) {
      return res.status(404).json({
        message: "Tablero no encontrado o no pertenece a tu empresa",
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
    if (incluyeNeutro !== undefined) board.incluyeNeutro = incluyeNeutro;
    if (location !== undefined) board.location = location.trim();
    if (description !== undefined) board.description = description.trim();
    if (images !== undefined) board.images = Array.isArray(images) ? images : [];

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
    const company = await Company.findOne({ publicCode: req.user.company });

    if (!company) {
      return res.status(404).json({ message: "Empresa no encontrada" });
    }

    const board = await Board.findOneAndDelete({
      code: req.params.code,
      company: company._id,
    });

    if (!board) {
      return res.status(404).json({ message: "Tablero no encontrado" });
    }

    return res.json({ message: "Tablero eliminado correctamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * =========================
 * 🌐 PÚBLICO (USER / DASHBOARD)
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

    const boards = await Board.find({ company: company._id })
      .select(
        "code name type tensionNominal numeroFases incluyeNeutro location description images createdAt"
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

// ✅ Obtener un tablero público por código
export const publicGetCompanyBoardByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const board = await Board.findOne({ code }).populate(
      "company",
      "name publicCode"
    );

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
        name: board.company?.name,
        publicCode: board.company?.publicCode,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};