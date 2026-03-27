import Board from "../models/Board.js";
import { v4 as uuidv4 } from "uuid";

import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import { formatName } from "../utils/format.js";

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

    const code = uuidv4();

    const board = await Board.create({
      name,
      location,
      description,
      code,
      company: req.user.company,
      createdBy: req.user.id,
      images
    });

    res.json({
      message: "Tablero creado",
      board,
      qrUrl: `${process.env.FRONT_URL}/board/${code}`
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const getBoards = async (req, res) => {
    try {
        const boards = await Board.find({
            company: req.user.company,
        });

        res.json(boards);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getBoardById = async (req, res) => {
    try {
        const board = await Board.findOne({
            _id: req.params.id,
            company: req.user.company,
        });

        if (!board) {
            return res.status(404).json({ message: "No encontrado" });
        }

        res.json(board);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateBoard = async (req, res) => {
  try {
    const { id } = req.params;

    const board = await Board.findOne({
      _id: id,
      company: req.user.company
    });

    if (!board) {
      return res.status(404).json({ message: "No encontrado" });
    }

    const files = req.files || {};

    // 🔴 imágenes a eliminar (enviadas desde frontend)
    const imagesToDelete = req.body.imagesToDelete
      ? JSON.parse(req.body.imagesToDelete)
      : [];

    // 🔥 eliminar de cloudinary
    for (const img of imagesToDelete) {
      await deleteFromCloudinary(img.public_id);

      // eliminar también de BD
      for (let key in board.images) {
        board.images[key] = board.images[key].filter(
          (i) => i.public_id !== img.public_id
        );
      }
    }

    // 🟢 agregar nuevas imágenes
    const company = formatName(req.user.company);
    const boardName = formatName(board.name);

    const uploadGroup = async (filesArray, type) => {
      if (!filesArray) return [];

      const folder = `user/${company}/${boardName}/${type}`;

      const uploads = filesArray.map(file =>
        uploadToCloudinary(file.buffer, folder)
      );

      return await Promise.all(uploads);
    };

    const newImages = {
      tablero: await uploadGroup(files.tablero, "tablero"),
      unifilar: await uploadGroup(files.unifilar, "unifilar"),
      leyenda: await uploadGroup(files.leyenda, "leyenda"),
      termografia: await uploadGroup(files.termografia, "termografia")
    };

    // combinar imágenes
    for (let key in newImages) {
      if (newImages[key].length > 0) {
        board.images[key].push(...newImages[key]);
      }
    }

    // actualizar datos
    board.name = req.body.name || board.name;
    board.location = req.body.location || board.location;
    board.description = req.body.description || board.description;

    await board.save();

    res.json({ message: "Actualizado", board });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBoard = async (req, res) => {
  try {
    const board = await Board.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!board) {
      return res.status(404).json({ message: "No encontrado" });
    }

    // 🔥 eliminar TODAS las imágenes de cloudinary
    for (let key in board.images) {
      for (let img of board.images[key]) {
        await deleteFromCloudinary(img.public_id);
      }
    }

    await board.deleteOne();

    res.json({ message: "Tablero eliminado completamente" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};