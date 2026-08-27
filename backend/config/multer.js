import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url); // eslint-disable-line no-underscore-dangle
const __dirname = path.dirname(__filename); // eslint-disable-line no-underscore-dangle

const uploadDir = path.join(__dirname, '..', 'uploads', 'leave-documents');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${Date.now()}${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Only pdf, jpg/jpeg, and png files are allowed');
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default upload;
