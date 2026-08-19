import { failure } from '../utils/apiResponse.js';

// Catches anything thrown/passed to next() in route handlers.
// Must stay the LAST middleware registered in server.js.
export function errorHandler(err, req, res, _next) {
  console.error('[error]', err);

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Something went wrong. Please try again later.'
      : err.message || 'Unexpected error';

  return failure(res, code, message, statusCode);
}

export function notFoundHandler(req, res) {
  return failure(res, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`, 404);
}
