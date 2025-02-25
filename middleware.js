// middlewares/upload.middleware.ts
import multer from "multer";
import fs from "fs";

const uploadsFolder = process.env.UPLOADS_FOLDER || "uploads";

if (!fs.existsSync(uploadsFolder)) {
  fs.mkdirSync(uploadsFolder, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsFolder);
  },
  filename: function (req, file, cb) {
    // Genera un nome file unico
    const uniqueSuffix = Date.now();
    cb(null, `(${uniqueSuffix})-${file.originalname}`);
  },
});

// Aggiunge filtro per i file
const fileFilter = (req, file, cb) => {
  cb(null, true);
  return;
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // limita a 5MB
  },
});

export default upload;
