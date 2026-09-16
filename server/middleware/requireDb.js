import mongoose from 'mongoose';
import { failure } from '../utils/apiResponse.js';

/**
 * Discovered via live Phase 7 integration testing: without this guard,
 * a write attempt while MongoDB is disconnected doesn't fail until
 * Mongoose's default 10-second command-buffering timeout expires, and
 * surfaces as an opaque `INTERNAL_ERROR` ("...insertOne() buffering
 * timed out..."). Checking connection state up front fails fast with a
 * specific, actionable error code instead.
 */
export function requireDb(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return failure(
      res,
      'DATABASE_UNAVAILABLE',
      'The database is not connected. Check MONGODB_URI and try again.',
      503
    );
  }
  return next();
}

export default requireDb;
