// ============================================================
// DigiQuest Studio — Global Error Handler Middleware
// ============================================================

function errorHandler(err, req, res, _next) {
  console.error(`[${new Date().toISOString()}] ERROR:`, err.message);
  console.error(err.stack);

  // Multer file-size / file-type errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File too large. Maximum size is 50 MB.',
      code: 413
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field in upload.',
      code: 400
    });
  }

  // SQLite constraint errors
  if (err.message && err.message.includes('UNIQUE constraint failed')) {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists.',
      code: 409
    });
  }

  if (err.message && err.message.includes('CHECK constraint failed')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid value for one or more fields.',
      code: 400
    });
  }

  if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist.',
      code: 400
    });
  }

  // Default 500
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500
      ? 'An internal server error occurred. Please try again later.'
      : err.message,
    code: statusCode
  });
}

module.exports = errorHandler;
