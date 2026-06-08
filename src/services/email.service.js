import transporter from "../config/nodemailer.js";

export const sendVerificationEmail = async (
    email,
    token
) => {
    const verificationUrl =
        `${process.env.FRONTEND_URL}/auth/verify-email/${token}`;

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