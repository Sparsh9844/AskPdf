'use strict';

const ApiError = require('../utils/apiError');

/**
 * Global error handler — must be the LAST middleware registered in app.js
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Multer file-size / type errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large.', status: 413 });
  }

  // Our own structured errors
  if (err instanceof ApiError || err.status) {
    return res.status(err.status ?? 400).json({
      error:  err.message,
      status: err.status ?? 400,
      ...(Object.keys(err.meta ?? {}).length ? { meta: err.meta } : {}),
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: messages.join(', '), status: 400 });
  }

  // Mongoose cast errors (bad ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid id: ${err.value}`, status: 400 });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate key error.', status: 409 });
  }

  // Unexpected errors — log full stack in dev, generic message in prod
  const isDev = process.env.NODE_ENV !== 'production';
  console.error('[errorHandler]', err);
  res.status(500).json({
    error:  isDev ? err.message : 'Internal server error.',
    status: 500,
    ...(isDev ? { stack: err.stack } : {}),
  });
}

module.exports = errorHandler;
