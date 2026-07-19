/** Wraps async route handlers so thrown errors reach the error middleware instead of hanging the request. */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/** Express error-handling middleware — must be registered LAST, after all routes. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === '23505') { // Postgres unique_violation
    return res.status(409).json({ success: false, message: 'That value already exists.', code: 'DUPLICATE' });
  }
  if (err.code === '23503') { // Postgres foreign_key_violation
    return res.status(400).json({ success: false, message: 'Referenced record does not exist.', code: 'INVALID_REFERENCE' });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: status === 500 ? 'Something went wrong on our end.' : err.message,
    code: err.code || 'ERROR'
  });
}

/** Throw this from anywhere in a controller for a clean, intentional client-facing error. */
class ApiError extends Error {
  constructor(statusCode, message, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

module.exports = { asyncHandler, errorHandler, ApiError };
