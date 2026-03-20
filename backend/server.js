import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';

import authRoutes from './routes/auth.js';
import teamRoutes from './routes/teams.js';
import playerRoutes from './routes/players.js';
import matchRoutes from './routes/matches.js';
import financeRoutes from './routes/finance.js';
import dashboardRoutes from './routes/dashboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Behind Vercel / proxies (needed for secure cookies / correct client IP if you add them later)
app.set('trust proxy', 1);

/** Vercel runs Express natively (no app.listen). Connect Mongo before each request (cached in db.js). */
const isVercel = Boolean(process.env.VERCEL);

app.use(cors({
  // Allow requests from your frontend (Netlify/Render) when deployed.
  // Set CORS_ORIGIN as a comma-separated list, e.g.:
  //   https://your-netlify-site.com
  // If not set, default to allowing all origins.
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const env = process.env.CORS_ORIGIN || '';
    const allowed = env
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    // If no allowed origins provided, allow all.
    if (!allowed.length) return callback(null, true);

    if (allowed.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (isVercel) {
  app.use(async (req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (err) {
      console.error('MongoDB:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message:
            'Database connection failed. Set MONGODB_URI in Vercel → Environment Variables.'
        });
      }
    }
  });
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Night Cricket API' });
});

// Friendly root when opening the Vercel URL in a browser
app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Night Cricket API',
    health: '/api/health'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Local / Render: start HTTP server. Vercel uses default export only (see Vercel Express docs).
if (!isVercel) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(() => process.exit(1));
}

export default app;
