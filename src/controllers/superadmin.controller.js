// src/controllers/superadmin.controller.js
import User from "../models/User.js";

// 📌 Crear otro superadmin
export const createSuperAdmin = async (req, res) => {
  const { name, email, password } = req.body;

  const user = await User.create({
    name,
    email,
    password,
    role: "SUPERADMIN",
  });

  res.status(201).json(user);
};

// 📌 Listar
export const getSuperAdmins = async (req, res) => {
  const users = await User.find({ role: "SUPERADMIN" }).select("-password");
  res.json(users);
};

// 📌 Obtener uno
export const getSuperAdminById = async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  res.json(user);
};

// 📌 Actualizar
export const updateSuperAdmin = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  }).select("-password");

  res.json(user);
};

// 📌 Eliminar
export const deleteSuperAdmin = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "SuperAdmin eliminado" });
};