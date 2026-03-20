/**
 * Vercel serverless entry — Express cannot use app.listen() on Vercel.
 * All routes are forwarded here via vercel.json rewrites.
 */
import serverless from 'serverless-http';
import app from '../server.js';
import { connectDB } from '../config/db.js';

const handler = serverless(app);

export default async function vercelHandler(req, res) {
  try {
    await connectDB();
    return handler(req, res);
  } catch (err) {
    console.error('Vercel handler error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Database connection failed. Set MONGODB_URI in Vercel → Environment Variables.',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
}
