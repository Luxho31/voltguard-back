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
    const { name, location, description } = req.body;

    const files = req.files;

    const company = formatName(req.user.company); // volvo
    const boardName = `${formatName(name)}-${Date.now()}`; // td-administracion

    // función helper
    const uploadGroup = async (filesArray, type) => {
      if (!filesArray) return [];

      const folder = `user/${company}/${boardName}/${type}`;

      const uploads = filesArray.map(file =>
        uploadToCloudinary(file.buffer, folder)
      );

      return await Promise.all(uploads);
    };

    const images = {
      tablero: await uploadGroup(files.tablero, "tablero"),
      unifilar: await uploadGroup(files.unifilar, "unifilar"),
      leyenda: await uploadGroup(files.leyenda, "leyenda"),
      termografia: await uploadGroup(files.termografia, "termografia")
    };

    // TODO: Corregir esta parte porque debe ser un link del QR
    const code = uuidv4();

    const board = await Board.create({
      code: uuidv4(), // 🔥 código público único
      name: name.trim(),
      location: location?.trim() || "",
      description: description?.trim() || "",
      images: Array.isArray(images) ? images : [],
      company: req.user.company,
      createdBy: req.user.id,
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
    const boards = await Board.find({ company: req.user.company })
      .populate("company", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.json(boards);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ✅ Obtener un tablero por ID (solo si pertenece a su empresa)
export const getCompanyBoardByCode = async (req, res) => {
  try {
    const board = await Board.findOne({
      _id: req.params.id,
      company: req.user.company,
    }).populate("company", "name");

    if (!board) {
      return res.status(404).json({ message: "Tablero no encontrado" });
    }

    return res.json(board);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateBoard = async (req, res) => {
  try {
    const { name, location, description, images } = req.body;

    // 🔒 Validar usuario
    if (!req.user) {
      return res.status(401).json({ message: "No autorizado" });
    }

    // 🔒 Validar empresa asignada
    if (!req.user.company) {
      return res.status(400).json({
        message: "El usuario no tiene empresa asignada",
      });
    }

    // 🔒 Buscar tablero SOLO de su empresa
    const board = await Board.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!board) {
      return res.status(404).json({
        message: "Tablero no encontrado o no pertenece a tu empresa",
      });
    }

    // ✏️ Actualizar campos (solo si vienen)
    if (name !== undefined) {
      if (name.trim() === "") {
        return res.status(400).json({
          message: "El nombre no puede estar vacío",
        });
      }
      board.name = name.trim();
    }

    if (location !== undefined) {
      board.location = location.trim();
    }

    if (description !== undefined) {
      board.description = description.trim();
    }

    if (images !== undefined) {
      board.images = Array.isArray(images) ? images : [];
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
    const board = await Board.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!board) {
      return res.status(404).json({ message: "Tablero no encontrado" });
    }

    return res.json({ message: "Tablero eliminado" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};




/**
 * =========================
 * 🌐 PÚBLICO
 * =========================
 */

// ✅ Obtener tableros por empresa (QR empresa)
export const publicGetCompanyBoards = async (req, res) => {
  try {
    const { publicCode } = req.params;

    const company = await Company.findOne({ publicCode });

    if (!company) {
      return res.status(404).json({ message: "Empresa no encontrada" });
    }

    const boards = await Board.find({ company: company._id })
      .select("code name location description images createdAt")
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

// ✅ Obtener un tablero público por código (QR tablero)
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
      name: board.name,
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