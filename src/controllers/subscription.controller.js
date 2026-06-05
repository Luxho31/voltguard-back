import User from "../models/User.js"

const subscription = async (req, res) => {
    try {
        // En producción usarías req.user._id proveniente de tu middleware de Auth
        // Para la simulación, asumimos que viene en los headers o req.body
        const userId = req.user._id; 
        const { chosenPlan } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: "ID de usuario no proporcionado." });
        }

        if (!["free", "basic", "pro"].includes(chosenPlan)) {
            return res.status(400).json({ success: false, message: "Plan inválido." });
        }

        // Actualizamos el plan del usuario en MongoDB
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { plan: chosenPlan },
            { new: true }
        ).select("-password"); // Excluir contraseña por seguridad

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "Usuario no encontrado." });
        }

        res.status(200).json({
            success: true,
            message: `¡Suscripción simulada con éxito! Tu cuenta ahora está en el Plan ${chosenPlan.toUpperCase()}.`,
            user: updatedUser
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Error en el servidor.", error: error.message });
    }
}

export { subscription }