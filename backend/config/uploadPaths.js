import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Vercel serverless FS is read-only except /tmp — writing under backend/uploads crashes at import time. */
export const isVercelUpload = Boolean(process.env.VERCEL);

export const uploadsRoot = isVercelUpload
  ? path.join('/tmp', 'night-cricket-uploads')
  : path.join(__dirname, '..', 'uploads');

export const userUploadDir = path.join(uploadsRoot, 'users');
export const playerUploadDir = path.join(uploadsRoot, 'players');
