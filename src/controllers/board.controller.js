import Board from "../models/Board.js";
import Company from "../models/Company.js";
import { v4 as uuidv4 } from "uuid";

export const createBoard = async (req, res) => {
  try {
    const { name, location, description, images } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "No autorizado" });
    }

    if (!req.user.company) {
      return res.status(400).json({
        message: "El usuario no tiene una empresa asignada",
      });
    }

    if (!name || name.trim() === "") {
      return res.status(400).json({
        message: "El nombre es obligatorio",
      });
    }

    const board = await Board.create({
      code: uuidv4(),
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
      message: "Error al crear el tablero",
      error: error.message,
    });
  }
};

export const getCompanyBoards = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "No autorizado" });
    }

    if (!req.user.company) {
      return res.status(400).json({
        message: "El usuario no tiene una empresa asignada",
      });
    }

    const boards = await Board.find({ company: req.user.company })
      .populate("company", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json(boards);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getCompanyBoardByCode = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "No autorizado" });
    }

    if (!req.user.company) {
      return res.status(400).json({
        message: "El usuario no tiene una empresa asignada",
      });
    }

    const board = await Board.findOne({
      _id: req.params.id,
      company: req.user.company,
    })
      .populate("company", "name")
      .populate("createdBy", "name email");

    if (!board) {
      return res.status(404).json({ message: "Tablero no encontrado" });
    }

    return res.status(200).json(board);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteBoard = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "No autorizado" });
    }

    if (!req.user.company) {
      return res.status(400).json({
        message: "El usuario no tiene una empresa asignada",
      });
    }

    const board = await Board.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!board) {
      return res.status(404).json({ message: "Tablero no encontrado" });
    }

    return res.status(200).json({ message: "Tablero eliminado correctamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

//FUNCIONES PUBLICAS
// 🔹 1. Obtener tableros de una empresa (para sidebar / vista principal)
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


// 🔹 2. Obtener un tablero por su código (vista QR directa)
export const publicGetCompanyBoardByCode = async (req, res) => {
  try {
    const { publicCode } = req.params;

    const board = await Board.findOne({ code: publicCode })
      .populate("company", "name publicCode"); // 👈 aquí traes la empresa

    if (!board) {
      return res.status(404).json({ message: "Tablero no encontrado" });
    }

    return res.json({
      board: {
        name: board.name,
        location: board.location,
        description: board.description,
        images: board.images,
        createdAt: board.createdAt,
      },
      company: board.company
        ? {
            name: board.company.name,
            publicCode: board.company.publicCode,
          }
        : null,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};