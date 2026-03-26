import Company from "../models/Company.js";

export const createCompany = async (req, res) => {
  try {
    const company = new Company(req.body);
    await company.save();
    res.status(200).json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};