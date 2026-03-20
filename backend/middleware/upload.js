import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { userUploadDir, uploadsRoot } from '../config/uploadPaths.js';

function ensureDirs() {
  try {
    [uploadsRoot, userUploadDir].forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  } catch (e) {
    console.error('upload dirs:', e.message);
    throw e;
  }
}

ensureDirs();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, userUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `user-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/i.test(path.extname(file.originalname));
    if (allowed) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

export default upload;
