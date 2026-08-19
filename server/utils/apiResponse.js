// Consistent response envelope used across every API route.
// { success, data, error }

export function success(res, data = {}, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, error: null });
}

export function failure(res, code, message, statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: { code, message },
  });
}
