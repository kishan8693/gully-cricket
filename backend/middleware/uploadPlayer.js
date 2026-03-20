import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { playerUploadDir } from '../config/uploadPaths.js';

function ensureDir() {
  try {
    if (!fs.existsSync(playerUploadDir)) fs.mkdirSync(playerUploadDir, { recursive: true });
  } catch (e) {
    console.error('player upload dir:', e.message);
    throw e;
  }
}

ensureDir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, playerUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `player-${Date.now()}${ext}`);
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
