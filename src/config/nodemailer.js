import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Usa SSL
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // DEBE SER LA CONTRASEÑA DE APLICACIÓN DE 16 CARACTERES
    },
});

// Prueba opcional para verificar la conexión al arrancar
transporter.verify((error) => {
    if (error) {
        console.error("❌ Error en la configuración de Nodemailer/Gmail:", error.message);
    } else {
        console.log("✅ Servidor de correo listo para enviar mensajes");
    }
});

export default transporter;