import User from "../models/User.js";
import jwt from "jsonwebtoken";

export const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ message: "No autorizado" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 🔥 buscar usuario en BD
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(401).json({ message: "Usuario no existe" });
        }

        // 🔥 ahora req.user tiene TODO
        req.user = user;

        next();
    } catch (error) {
        return res.status(401).json({ message: "Token inválido" });
    }
};

export const requireRole = (role) => (req, res, next) => {
    if (req.user.role !== role) {
        return res.status(403).json({ message: "Acceso denegado" });
    }
    next();
};
