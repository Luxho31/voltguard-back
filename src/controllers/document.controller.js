import Document from "../models/Document.js";
import { v2 as cloudinary } from "cloudinary";

// Función utilitaria para subir el buffer de memoria a Cloudinary usando Streams
// Modifica esta función en tu controlador de la parte de atrás (Backend)
const uploadFromBuffer = (fileBuffer, companyPublicCode, originalName) => {
    return new Promise((resolve, reject) => {
        // Extraemos la extensión o aseguramos que termine en .pdf
        const cleanName = originalName.toLowerCase().endsWith('.pdf') 
            ? originalName.replace(/\.pdf$/i, '') 
            : originalName;

        const stream = cloudinary.uploader.upload_stream(
            {
                folder: `tableros_electricos/documentos/${companyPublicCode}`,
                // 👇 1. CAMBIO CLAVE: Se usa "image" (Cloudinary trata los PDFs como imágenes vectoriales multi-página)
                resource_type: "image", 
                // 👇 2. CAMBIO CLAVE: Forzamos el formato PDF para que genere las cabeceras HTTP correctas
                format: "pdf", 
                public_id: cleanName, 
                keep_original_filename: true,
            },
            (error, result) => {
                if (result) resolve(result);
                else reject(error);
            }
        );
        stream.end(fileBuffer);
    });
};

// 1. SUBIR MULTIPLES DOCUMENTOS (POST)
export const uploadDocuments = async (req, res) => {
    try {
        const { companyPublicCode, uploadedBy, types, titles } = req.body;
        // Nota: Si mandas títulos y tipos personalizados por cada archivo desde el front, 
        // llegarán como arrays en req.body.types y req.body.titles.

        // Validar que vengan archivos en la petición
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No se han seleccionado archivos PDF" });
        }

        // Mapeamos los archivos para subirlos todos en paralelo
        const uploadPromises = req.files.map(async (file, index) => {
            // Subir a Cloudinary desde el buffer de memoria
            const cloudinaryResult = await uploadFromBuffer(file.buffer, companyPublicCode, file.originalname);

            // Determinar título y tipo (si vienen como arrays del front, si no, usa un fallback)
            const documentTitle = Array.isArray(titles) ? titles[index] : (titles || file.originalname);
            const documentType = Array.isArray(types) ? types[index] : (types || "MANTENIMIENTO");

            // Crear el registro de Mongo
            const newDocument = new Document({
                title: documentTitle,
                type: documentType,
                companyPublicCode,
                cloudinaryUrl: cloudinaryResult.secure_url,
                cloudinaryPublicId: cloudinaryResult.public_id,
                uploadedBy
            });

            return await newDocument.save();
        });

        // Ejecutar todas las subidas y guardados concurrentemente
        const savedDocuments = await Promise.all(uploadPromises);

        return res.status(201).json({
            message: `${savedDocuments.length} documentos subidos con éxito`,
            documents: savedDocuments
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error en la subida múltiple", error: error.message });
    }
};

// 1. SUBIR / CREAR DOCUMENTO (POST)
// export const uploadDocument = async (req, res) => {
//     try {
//         const { title, type, companyPublicCode, uploadedBy } = req.body;

//         // Validar que venga el archivo desde Multer
//         if (!req.file) {
//             return res.status(400).json({ message: "El archivo PDF es requerido" });
//         }

//         // Subir archivo a Cloudinary (forzando formato PDF y en una carpeta organizada)
//         // Multer nos da el archivo en req.file.path (si usas DiskStorage o CloudinaryStorage)
//         const result = await cloudinary.uploader.upload(req.file.path, {
//             folder: `tableros_electricos/documentos/${companyPublicCode}`,
//             resource_type: "raw", // Usamos 'raw' para PDFs y archivos no-imagen
//         });

//         const newDocument = new Document({
//             title,
//             type,
//             companyPublicCode,
//             cloudinaryUrl: result.secure_url,
//             cloudinaryPublicId: result.public_id,
//             uploadedBy // ID del usuario que lo sube
//         });

//         await newDocument.save();
//         return res.status(201).json(newDocument);
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Error al subir el documento", error: error.message });
//     }
// };

// 2. OBTENER DOCUMENTOS POR EMPRESA (GET)
export const getDocumentsByCompany = async (req, res) => {
    try {
        const { companyPublicCode } = req.params;
        const documents = await Document.find({ companyPublicCode }).sort({ createdAt: -1 });
        return res.status(200).json(documents);
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener documentos", error: error.message });
    }
};

// 3. ACTUALIZAR DATOS DEL DOCUMENTO (PUT)
// Nota: Normalmente solo se actualiza el título o el tipo. Si se quiere cambiar el archivo, es mejor borrar y subir otro.
export const updateDocumentData = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, type } = req.body;

        const updatedDocument = await Document.findByIdAndUpdate(
            id,
            { $set: { title, type } },
            { new: true } // Para que devuelva el documento ya modificado
        );

        if (!updatedDocument) {
            return res.status(404).json({ message: "Documento no encontrado" });
        }

        return res.status(200).json(updatedDocument);
    } catch (error) {
        return res.status(500).json({ message: "Error al actualizar documento", error: error.message });
    }
};

// 4. ELIMINAR DOCUMENTO (DELETE)
export const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;

        const document = await Document.findById(id);
        if (!document) {
            return res.status(404).json({ message: "Documento no encontrado" });
        }

        // Eliminar físicamente de Cloudinary primero
        await cloudinary.uploader.destroy(document.cloudinaryPublicId, { resource_type: "image" });

        // Eliminar de la base de datos
        await Document.findByIdAndDelete(id);

        return res.status(200).json({ message: "Documento eliminado correctamente tanto de la BD como de Cloudinary" });
    } catch (error) {
        return res.status(500).json({ message: "Error al eliminar el documento", error: error.message });
    }
};