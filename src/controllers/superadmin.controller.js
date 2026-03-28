// src/controllers/superadmin.controller.js
import User from "../models/User.js";

// 📌 Crear otro superadmin
export const createSuperAdmin = async (req, res) => {
  const { name, email, password } = req.body;

  const user = await User.create({
    name,
    email,
    password,
    role: "superadmin",
  });

  res.status(201).json(user);
};

// 📌 Listar
export const getSuperAdmins = async (req, res) => {
  const users = await User.find({ role: "superadmin" }).select("-password");
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

export const createAdmin = async (req, res) => {
  try {
    const { name, email, password, company } = req.body;

    // Validar que no exista
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Usuario ya existe" });
    }

    const admin = await User.create({
      name,
      email,
      password,
      role: "admin",
      company, // 👈 aquí asignas empresa
    });

    res.status(201).json({
      message: "Admin creado",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        company: admin.company,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select("-password");
    res.status(200).json(admins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminById = async (req, res) => {
  try {
    const admin = await User.findById(req.params.id).select("-password");
    if (!admin) {
      return res.status(404).json({ message: "Admin no encontrado" });
    } else if (admin.role !== "admin") {
      return res.status(400).json({ message: "No es un admin" });
    }
    res.status(200).json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
