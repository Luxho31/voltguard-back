import Company from "../models/Company.js";
import { v4 as uuidv4 } from "uuid";

export const createCompany = async (req, res) => {
    try {
        const { name, ruc } = req.body;

        const company = await Company.create({
            name,
            ruc,
            publicCode: uuidv4(), // 🔥 clave pública
        });

        res.json(company);
    } catch (error) {
        console.log("CREATE COMPANY ERROR:", error.message);
        res.status(500).json({ message: error.message });
    }
};

// GET /api/public/companies
// export const getPublicCompanies = async (req, res) => {
//     const companies = await Company.find().select("name publicCode");
//     res.json(companies);
// };

export const getCompanies = async (req, res) => {
    try {
        const { page = 0, size = 5 } = req.query;

        const companies = await Company.find()
            .skip(page * size)
            .limit(Number(size));

        const total = await Company.countDocuments();

        res.json({
            content: companies,
            totalPages: Math.ceil(total / size),
            totalElement: total,
            size: Number(size),
            number: Number(page),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
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
