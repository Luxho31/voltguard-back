import Board from "../models/Board.js";
import Company from "../models/Company.js";
import { v4 as uuidv4 } from "uuid";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";

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

    if (!name || !type)
      return res.status(400).json({ message: "name y type son obligatorios" });

    if (
      tensionNominal === undefined ||
      numeroFases === undefined ||
      incluyeNeutro === undefined
    )
      return res.status(400).json({
        message: "tensionNominal, numeroFases e incluyeNeutro son obligatorios",
      });

    if (!req.user)
      return res.status(401).json({ message: "No autorizado" });

    const company = await Company.findById(companyPublicCode);
    if (!company)
      return res.status(404).json({ message: "Empresa no encontrada" });

    const imageFields = ["tablero", "unifilar", "leyenda", "termografia"];

    const images = {
      tablero: [],
      unifilar: [],
      leyenda: [],
      termografia: [],
    };

    for (const field of imageFields) {
      const files = req.files?.[field] || [];

      for (const file of files) {
        const { url } = await uploadToCloudinary(
          file.buffer,
          `boards/${field}`
        );
        images[field].push(url);
      }
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
        return res.status(404).json({ message: "Empresa no encontrada" });
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
      existingImages,
    } = req.body;

    const { publicCode, code } = req.params;

    if (!req.user)
      return res.status(401).json({ message: "No autorizado" });

    const company = await Company.findOne({ publicCode });
    if (!company)
      return res.status(404).json({ message: "Empresa no encontrada" });

    const board = await Board.findOne({
      code,
      companyPublicCode: publicCode,
    });

    if (!board)
      return res.status(404).json({ message: "Tablero no encontrado" });

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

    const imageFields = ["tablero", "unifilar", "leyenda", "termografia"];

    const parsedExisting = {
      tablero: [],
      unifilar: [],
      leyenda: [],
      termografia: [],
    };

    if (existingImages) {
      const arr = Array.isArray(existingImages)
        ? existingImages
        : JSON.parse(existingImages || "[]");

      for (const url of arr) {
        if (url.includes("boards/tablero")) parsedExisting.tablero.push(url);
        else if (url.includes("boards/unifilar")) parsedExisting.unifilar.push(url);
        else if (url.includes("boards/leyenda")) parsedExisting.leyenda.push(url);
        else if (url.includes("boards/termografia"))
          parsedExisting.termografia.push(url);
      }
    }

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

      board.images[field] = [
        ...parsedExisting[field],
        ...uploaded,
      ];
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