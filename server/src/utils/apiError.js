'use strict';

/**
 * Structured API error with an HTTP status code.
 * Throw this anywhere — the global error handler picks it up.
 */
class ApiError extends Error {
  /**
   * @param {number} status   HTTP status code
   * @param {string} message  Human-readable error message
   * @param {object} [meta]   Optional extra data attached to the response
   */
  constructor(status, message, meta = {}) {
    super(message);
    this.name   = 'ApiError';
    this.status = status;
    this.meta   = meta;
  }

  static badRequest(msg, meta)   { return new ApiError(400, msg, meta); }
  static notFound(msg = 'Not found') { return new ApiError(404, msg); }
  static conflict(msg)           { return new ApiError(409, msg); }
  static internal(msg = 'Internal server error') { return new ApiError(500, msg); }
}

module.exports = ApiError;
