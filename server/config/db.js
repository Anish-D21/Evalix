import mongoose from 'mongoose';

// Establishes the MongoDB Atlas / local MongoDB connection.
// Called once from server.js at startup. Business logic and routes
// must never open their own connections.
export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn(
      '[db] MONGODB_URI is not set. The API will start, but any database ' +
        'operation will fail until it is configured in server/.env.'
    );
    return null;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log('[db] Connected to MongoDB');
    return mongoose.connection;
  } catch (err) {
    console.error('[db] MongoDB connection error:', err.message);
    // Phase 0: do not crash the whole process just because the DB is
    // unreachable — later phases may want a stricter policy.
    return null;
  }
}

export default connectDB;
