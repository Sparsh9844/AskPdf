'use strict';

const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const ApiError = require('../utils/apiError');
const { getJwtSecret } = require('../config/auth');

/**
 * requireAuth — verifies the Bearer token and attaches the user.
 *
 * Sets:
 *   req.user    — the User document
 *   req.userId  — ObjectId, for scoping queries ({ owner: req.userId })
 */
async function requireAuth(req, _res, next) {
  if (req.user) return next();   // already verified by an outer mount

  const header = req.headers.authorization ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Please sign in to continue.');

  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch (err) {
    throw new ApiError(401, err.name === 'TokenExpiredError'
      ? 'Your session has expired. Please sign in again.'
      : 'Invalid session. Please sign in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'Account not found. Please sign in again.');

  req.user   = user;
  req.userId = user._id;
  next();
}

module.exports = { requireAuth };
