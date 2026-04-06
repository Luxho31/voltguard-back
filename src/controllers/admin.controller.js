import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Company from "../models/Company.js";

/**
 * =========================
 * 🔒 SOLO SUPERADMIN
 * CRUD DE USUARIOS ADMIN
 * =========================
 */

// ✅ Crear ADMIN
export const createAdmin = async (req, res) => {
    try {
        const {
            firstname,
            lastname,
            email,
            password,
            companyPublicCode,
        } = req.body;

        if (!firstname || !lastname || !email || !password || !companyPublicCode) {
            return res.status(400).json({
                message:
                    "firstname, lastname, email, password y companyPublicCode son obligatorios",
            });
        }

        const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                message: "Ya existe un usuario con este correo",
            });
        }

        const company = await Company.findOne({ publicCode: companyPublicCode });
        if (!company) {
            return res.status(404).json({
                message: "Empresa no encontrada",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = await User.create({
            firstname: firstname.trim(),
            lastname: lastname.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            role: "ADMIN",
            company: company.publicCode, // ✅ guardar publicCode, no _id
        });

        return res.status(201).json({
            message: "Administrador creado correctamente",
            admin: {
                _id: admin._id,
                firstname: admin.firstname,
                lastname: admin.lastname,
                email: admin.email,
                role: admin.role,
                company: admin.company,
                isActive: admin.isActive,
                createdAt: admin.createdAt,
            },
        });
    } catch (error) {
        console.log("CREATE ADMIN ERROR:", error.message);
        return res.status(500).json({
            message: error.message,
        });
    }
};

// ✅ Traer todos los usuarios del sistema
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select("-password")
            .sort({ createdAt: -1 });

        const companies = await Company.find().select("name publicCode");
        const companyMap = new Map(companies.map((c) => [c.publicCode, c.name]));

        const usersWithCompany = users.map((user) => ({
            _id: user._id,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            company: user.company
                ? {
                    publicCode: user.company,
                    name: companyMap.get(user.company) || "Empresa no encontrada",
                }
                : null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        }));

        return res.json(usersWithCompany);
    } catch (error) {
        console.log("GET ALL USERS ERROR:", error.message);
        return res.status(500).json({
            message: error.message,
        });
    }
};

// ✅ Listar ADMINs
export const getAdmins = async (req, res) => {
    try {
        const admins = await User.find({ role: "ADMIN" })
            .select("-password")
            .sort({ createdAt: -1 });

        const companies = await Company.find().select("name publicCode");
        const companyMap = new Map(companies.map((c) => [c.publicCode, c.name]));

        const adminsWithCompany = admins.map((admin) => ({
            _id: admin._id,
            firstname: admin.firstname,
            lastname: admin.lastname,
            email: admin.email,
            role: admin.role,
            isActive: admin.isActive,
            company: admin.company
                ? {
                    publicCode: admin.company,
                    name: companyMap.get(admin.company) || "Empresa no encontrada",
                }
                : null,
            createdAt: admin.createdAt,
            updatedAt: admin.updatedAt,
        }));

        return res.json(adminsWithCompany);
    } catch (error) {
        console.log("GET ADMINS ERROR:", error.message);
        return res.status(500).json({
            message: error.message,
        });
    }
};

// ✅ Obtener ADMIN por ID
export const getAdminById = async (req, res) => {
    try {
        const admin = await User.findOne({
            _id: req.params.id,
            role: "ADMIN",
        }).select("-password");

        if (!admin) {
            return res.status(404).json({
                message: "Administrador no encontrado",
            });
        }

        let companyData = null;

        if (admin.company) {
            const company = await Company.findOne({ publicCode: admin.company }).select(
                "name publicCode"
            );

            if (company) {
                companyData = {
                    name: company.name,
                    publicCode: company.publicCode,
                };
            }
        }

        return res.json({
            _id: admin._id,
            firstname: admin.firstname,
            lastname: admin.lastname,
            email: admin.email,
            role: admin.role,
            isActive: admin.isActive,
            company: companyData,
            createdAt: admin.createdAt,
            updatedAt: admin.updatedAt,
        });
    } catch (error) {
        console.log("GET ADMIN BY ID ERROR:", error.message);
        return res.status(500).json({
            message: error.message,
        });
    }
};

// ✅ Editar ADMIN
export const updateAdmin = async (req, res) => {
    try {
        const {
            firstname,
            lastname,
            email,
            password,
            isActive,
            companyPublicCode,
        } = req.body;

        const admin = await User.findOne({
            _id: req.params.id,
            role: "ADMIN",
        });

        if (!admin) {
            return res.status(404).json({
                message: "Administrador no encontrado",
            });
        }

        if (firstname !== undefined) {
            if (!firstname.trim()) {
                return res.status(400).json({ message: "El nombre no puede estar vacío" });
            }
            admin.firstname = firstname.trim();
        }
        if (lastname !== undefined) {
            if (!lastname.trim()) {
                return res.status(400).json({ message: "El apellido no puede estar vacío" });
            }
            admin.lastname = lastname.trim();
        }

        if (email !== undefined) {
            const normalizedEmail = email.trim().toLowerCase();

            const existingUser = await User.findOne({
                email: normalizedEmail,
                _id: { $ne: admin._id },
            });

            if (existingUser) {
                return res.status(400).json({
                    message: "Ya existe otro usuario con este correo",
                });
            }

            admin.email = normalizedEmail;
        }

        if (password !== undefined && password.trim() !== "") {
            admin.password = await bcrypt.hash(password, 10);
        }

        if (isActive !== undefined) {
            admin.isActive = Boolean(isActive);
        }

        if (companyPublicCode !== undefined) {
            const company = await Company.findOne({ publicCode: companyPublicCode });

            if (!company) {
                return res.status(404).json({
                    message: "Empresa no encontrada",
                });
            }

            admin.company = company.publicCode; // ✅ guardar publicCode
        }

        await admin.save();

        return res.json({
            message: "Administrador actualizado correctamente",
            admin: {
                _id: admin._id,
                firstname: admin.firstname,
                lastname: admin.lastname,
                email: admin.email,
                role: admin.role,
                company: admin.company,
                isActive: admin.isActive,
                updatedAt: admin.updatedAt,
            },
        });
    } catch (error) {
        console.log("UPDATE ADMIN ERROR:", error.message);
        return res.status(500).json({
            message: error.message,
        });
    }
};

// ✅ Eliminar ADMIN
export const deleteAdmin = async (req, res) => {
    try {
        const admin = await User.findOneAndDelete({
            _id: req.params.id,
            role: "ADMIN",
        });

        if (!admin) {
            return res.status(404).json({
                message: "Administrador no encontrado",
            });
        }

        return res.json({
            message: "Administrador eliminado correctamente",
        });
    } catch (error) {
        console.log("DELETE ADMIN ERROR:", error.message);
        return res.status(500).json({
            message: error.message,
        });
    }
};