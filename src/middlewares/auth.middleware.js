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
        const user = await User.findById(decoded.id).populate("company", "name publicCode").select("-password");
        // console.log(user)

        if (!user) {
            return res.status(401).json({ message: "Usuario no existe" });
        }

        // 🔥 ahora req.user tiene TODO
        req.user = user;

        next();
    } catch (error) {
        return res.status(401).json({ message: "Token inválido" + error.message });
    }
};

export const requireRole = (role) => (req, res, next) => {
    // console.log(role)
    if (req.user.role !== role) {
        return res.status(403).json({ message: "Acceso denegado" });
    }
    next();
};


// --------

// src/middlewares/role.middleware.js
// export const isSuperAdmin = (req, res, next) => {
//   if (req.user.role !== "superadmin") {
//     return res.status(403).json({ message: "Acceso denegado" });
//   }
//   next();
// };

// export const roleMiddleware = (roles) => {
//   return (req, res, next) => {
//     console.log("Consola", res)
//     if (!roles.includes(req.user.role)) {
//       return res.status(403).json({ message: "No tienes permiso" });
//     }
//     next();
//   };
// };