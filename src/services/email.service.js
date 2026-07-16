import transporter from "../config/nodemailer.js";

export const sendVerificationEmail = async (email, token) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email/${token}`;

    await transporter.sendMail({
        from: `"VoltGuard" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Verifica tu cuenta",
        html: `
            <h2>Bienvenido a VoltGuard</h2>

            <p>
                Haz clic en el siguiente enlace para verificar tu cuenta:
            </p>

            <a href="${verificationUrl}">
                Verificar cuenta
            </a>

            <p>
                Este enlace expirará en 1 hora.
            </p>
        `,
    });
};

export const sendResetPasswordEmail = async (email, token) => {
    // Construye la URL usando query param ?token=... tal como lo espera React
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;

    await transporter.sendMail({
        from: `"VoltGuard" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Restablece tu contraseña - VoltGuard",
        html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0797d5;">Restablecer Contraseña</h2>
        <p>Has solicitado restablecer tu contraseña en VoltGuard.</p>
        <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
        <a href="${resetUrl}" style="background-color: #0797d5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
          Cambiar contraseña
        </a>
        <p style="margin-top: 20px; font-size: 12px; color: #777;">
          Este enlace caducará en 1 hora. Si no lo solicitaste, puedes ignorar este mensaje.
        </p>
      </div>
    `,
    });
};
