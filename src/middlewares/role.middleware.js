// src/middlewares/role.middleware.js
export const isSuperAdmin = (req, res, next) => {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Acceso denegado" });
  }
  next();
};

export const roleMiddleware = (roles) => {
  return (req, res, next) => {
    console.log("Consola", res)
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "No tienes permiso" });
    }
    next();
  };
};