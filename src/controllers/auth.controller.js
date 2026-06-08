import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const register = async (req, res) => {
    try {
        const { firstname, lastname, email, password, companyPublicCode } = req.body;

        // Validar si el usuario ya existe
        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: "Usuario ya existe" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Generar un token único y seguro usando crypto
        const token = crypto.randomBytes(32).toString("hex");
        // Definir tiempo de expiración (1 hora a partir de este momento)
        const tokenExpires = new Date(Date.now() + 3600000); 

        // Crear el usuario con rol 'USER' y verificado en FALSE
        const user = await User.create({
            firstname,
            lastname,
            email,
            password: hashedPassword,
            companyPublicCode: companyPublicCode || null,
            role: "USER", // Rol por defecto solicitado
            verified: false, // Forzar verificación por correo
            verificationToken: token,
            verificationTokenExpires: tokenExpires,
        });

        // Enviar el correo electrónico real utilizando tu servicio
        await sendVerificationEmail(user.email, token);

        res.status(201).json({
            message: "Usuario registrado con éxito. Por favor, verifica tu correo electrónico.",
            user: {
                id: user._id,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                role: user.role,
                verified: user.verified
            },
        });
    } catch (error) {
        console.error("Error en el registro:", error);
        res.status(500).json({ message: "Error interno del servidor al registrar usuario." });
    }
};

// 2. NUEVO CONTROLADOR PARA PROCESAR LA VERIFICACIÓN
export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        // Buscar al usuario que posea el token y que este no haya expirado
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: new Date() }, // El vencimiento debe ser mayor a la hora actual
        });

        if (!user) {
            return res.status(400).json({ 
                message: "El enlace de verificación es inválido o ha expirado." 
            });
        }

        // Limpiar los campos del token y cambiar el estado verificado a TRUE
        user.verified = true;
        user.verificationToken = null;
        user.verificationTokenExpires = null;
        await user.save();

        res.status(200).json({ message: "Cuenta verificada con éxito. Ya puedes iniciar sesión." });
    } catch (error) {
        console.error("Error al verificar cuenta:", error);
        res.status(500).json({ message: "Error al procesar la verificación de la cuenta." });
    }
};

// 3. LOGIN REFACTORIZADO (Bloqueo si verified es false)
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Credenciales inválidas" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Credenciales inválidas" });
        }

        // RESTRICCIÓN DE VERIFICACIÓN CRÍTICA
        if (!user.verified) {
            return res.status(403).json({ 
                message: "No puedes ingresar. Por favor, verifica primero tu cuenta en tu correo electrónico." 
            });
        }

        const token = generateToken(user);

        res.cookie("token", token, {
            httpOnly: true,
            secure: true, 
            sameSite: "none", 
            path: "/",
        });

        res.status(200).json({
            message: "Login exitoso",
            user: {
                id: user._id,
                firstname: user.firstname,
                lastname: user.lastname,
                role: user.role,
                companyPublicCode: user.companyPublicCode
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
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
    res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
    });
    res.status(200).json({ message: "Sesión cerrada" });
};

export const getProfile = (req, res) => {
    try {
        // console.log(req.user)
        res.json(req.user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// auth.controller.js

import { sendVerificationEmail }
from "../services/email.service.js";

export const testEmail = async (req, res) => {
    try {

        await sendVerificationEmail(
            "serinlu2201@gmail.com",
            "TOKEN_PRUEBA"
        );

        res.json({
            message: "Correo enviado"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: error.message
        });
    }
};
