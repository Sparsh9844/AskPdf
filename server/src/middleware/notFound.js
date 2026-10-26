'use strict';

/** Catch-all for unknown routes */
function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}`, status: 404 });
}

module.exports = notFound;
