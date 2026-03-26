import Board from "../models/Board.js";
import { v4 as uuidv4 } from "uuid";
import { generateQR } from "../utils/generateQR.js";

export const createBoard = async (req, res) => {
  try {
    const { name, location, description, images } = req.body;

    const code = uuidv4();

    const board = new Board({
      code,
      name,
      location,
      description,
      images,
      company: req.user.company,
      createdBy: req.user.id,
    });

    await board.save();

    const qrUrl = `${process.env.FRONT_URL}/board/${code}`;
    const qr = await generateQR(qrUrl);

    res.json({ board, qr });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getBoards = async (req, res) => {
  const boards = await Board.find({ company: req.user.company });
  res.json(boards);
};

export const getBoardByCode = async (req, res) => {
  const board = await Board.findOne({ code: req.params.code });

  if (!board) return res.status(404).json({ message: "No encontrado" });

  res.json(board);
};

export const deleteBoard = async (req, res) => {
  await Board.findOneAndDelete({
    _id: req.params.id,
    company: req.user.company,
  });

  res.json({ message: "Eliminado" });
};