import User from "../models/User.js";
import bcrypt from "bcryptjs";

export const createAdmin = async (req, res) => {
    try {
        const { name, email, password, company } = req.body;

        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: "El usuario ya existe" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = await User.create({
            name,
            email,
            password: hashedPassword,
            role: "admin",
            company,
        });

        console.log(admin);

        res.status(201).json({ message: `${admin.name} creado` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getAdmins = async (req, res) => {
    try {
        const admins = await User.find({ role: "admin" }).select("-password");

        res.json(admins);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, company } = req.body;

        const admin = await User.findByIdAndUpdate(
            id,
            { name, email, company },
            { new: true },
        ).select("-password");

        console.log(admin);
        res.json({ message: `${admin.name} actualizado` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        await User.findByIdAndDelete(id);

        res.json({ message: `${admin.name} eliminado` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
