import Company from "../models/Company.js";
import { v4 as uuidv4 } from "uuid";

export const createCompany = async (req, res) => {
  const { name, ruc } = req.body;

  const company = await Company.create({
    name,
    ruc,
    publicCode: uuidv4(), // 🔥 clave pública
  });

  res.json(company);
};

// GET /api/public/companies
export const getPublicCompanies = async (req, res) => {
  const companies = await Company.find().select("name publicCode");
  res.json(companies);
};

// GET /api/public/company/:code/boards
export const getBoardsByCompanyCode = async (req, res) => {
  const company = await Company.findOne({
    publicCode: req.params.code,
  });

  if (!company) {
    return res.status(404).json({ message: "Empresa no encontrada" });
  }

  const boards = await Board.find({ company: company._id });

  res.json({
    company: {
      name: company.name,
    },
    boards,
  });
};