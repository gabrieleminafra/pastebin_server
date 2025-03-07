import multer from "multer";
import fs from "fs";

const uploadsFolder = "mount/uploads";

if (!fs.existsSync(uploadsFolder)) {
  fs.mkdirSync(uploadsFolder, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsFolder);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    cb(null, `(${uniqueSuffix})-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // limita a 1GB
  },
});

export default upload;
