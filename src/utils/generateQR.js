import QRCode from "qrcode";

export const generateQR = async (url) => {
    try {
        return await QRCode.toDataURL(url);
    } catch (error) {
        throw new Error("Error generando QR");
    }
};
