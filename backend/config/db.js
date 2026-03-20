import mongoose from 'mongoose';

/**
 * Reuse connection in serverless (Vercel) — same Lambda instance keeps the pool.
 */
export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/night_cricket';
  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    // On Vercel/serverless, never process.exit — let the handler return 500.
    if (process.env.VERCEL === '1') throw err;
    process.exit(1);
  }
};
