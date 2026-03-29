import User from "../models/User.js";
import bcrypt from "bcryptjs";

export const createAdmin = async (req, res) => {
    try {
        const { firstname, lastname, email, password, company } = req.body;

        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: "El usuario ya existe" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = await User.create({
            firstname,
            lastname,
            email,
            password: hashedPassword,
            role: "ADMIN",
            company,
        });

        console.log(admin);

        res.status(201).json({ message: `${admin.firstname + admin.lastname} creado` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getAdmins = async (req, res) => {
    try {
        const admins = await User.find({ role: "ADMIN" }).select("-password");

        res.json(admins);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstname, lastname, email, company } = req.body;

        const admin = await User.findByIdAndUpdate(
            id,
            { firstname, lastname, email, company },
            { new: true },
        ).select("-password");

        console.log(admin);
        res.json({ message: `${admin.firstname + admin.lastname} actualizado` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        await User.findByIdAndDelete(id);

        res.json({ message: `${admin.firstname + admin.lastname} eliminado` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
