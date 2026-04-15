import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import bcrypt from "bcryptjs";

export const login = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ message: "Credenciales inválidas" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({ message: "Credenciales inválidas" });
    }

    const token = generateToken(user);

    res.cookie("token", token, {
        httpOnly: true,
        secure: true, // true en producción (https)
        sameSite: "none", // para permitir cookies en dominios cruzados (frontend/backend separados)
    });

    // console.log({
    //     user: {
    //         id: user._id,
    //         name: user.name,
    //         role: user.role,
    //     },
    // });

    res.status(200).json({
        message: "Login exitoso",
        user: {
            id: user._id,
            firstname: user.firstname,
            lastname: user.lastname,
            role: user.role,
            company: user.company
        ? {
            _id: user.company._id,
            name: user.company.name,
            publicCode: user.company.publicCode,
          }
        : null,
        },
    });
};

// SOLO para inicial (puedes luego protegerlo)
export const registerSuperAdmin = async (req, res) => {
    try {
        const { firstname, lastname, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Usuario ya existe" });
    }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            firstname,
            lastname,
            email,
            password: hashedPassword,
            role: "SUPERADMIN",
        });

        // console.log(user);
        res.status(201).json({ message: "Superadmin creado", user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const logout = (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Sesión cerrada" });
};

export const getProfile = (req, res) => {
    try {
        // console.log(req.user)
        res.json(req.user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const register = async (req, res) => {
    try {
        const { firstname, lastname, email, password, company } = req.body;

        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: "Usuario ya existe" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            firstname,
            lastname,
            email,
            password: hashedPassword,
            company,
            role: "ADMIN",
        });

        res.status(201).json({
            message: "Usuario creado",
            user: {
                id: user._id,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                company: user.company,
                role: user.role,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
