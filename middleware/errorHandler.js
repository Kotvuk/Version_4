// ===== Global error handler =====

function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] ${err.stack}`);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Внутренняя ошибка сервера' : err.message
  });
}

// Async route handler wrapper
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, asyncHandler };
