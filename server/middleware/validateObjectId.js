import mongoose from 'mongoose';
import { failure } from '../utils/apiResponse.js';

/**
 * Found via code review, not live testing (no real MongoDB reachable
 * from this sandbox): passing a malformed `:id` straight to a Mongoose
 * query (findById, findByIdAndUpdate, findByIdAndDelete) throws an
 * uncaught CastError with no `statusCode` set, which the global error
 * handler then reports as a generic 500 — a client mistake (a bad ID in
 * the URL) was surfacing as a server error. Validating the param up
 * front fixes that with a clean 400 `INVALID_ID`, without touching the
 * 404 (valid-but-nonexistent id) or 503 (DB unavailable) paths at all.
 *
 * Uses `ObjectId.isValid(id) && String(new ObjectId(id)) === id` rather
 * than `ObjectId.isValid(id)` alone: the bare check has a well-known
 * false-positive gotcha where certain 12-character strings are accepted
 * (Mongoose allows constructing an ObjectId from either a 24-hex-char
 * string OR a raw 12-byte string). The round-trip comparison closes
 * that gap — confirmed empirically before writing this.
 */
export function validateObjectId(paramName = 'id') {
  return function (req, res, next) {
    const value = req.params[paramName];
    const isValid = mongoose.Types.ObjectId.isValid(value) && String(new mongoose.Types.ObjectId(value)) === value;

    if (!isValid) {
      return failure(res, 'INVALID_ID', `'${value}' is not a valid id.`, 400);
    }
    return next();
  };
}

export default validateObjectId;
