// src/controllers/auth.controller.js
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
        secure: false, // true en producción (https)
        sameSite: "lax",
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

export const profile = (req, res) => {
    try {
        res.json({
            id: req.user.id,
            firstname: req.user.firstname,
            lastname: req.user.lastname,
            company: req.user.company,
            role: req.user.role,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
