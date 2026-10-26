'use strict';

/**
 * auth.js — JWT secret resolution.
 *
 * Uses JWT_SECRET when set. Otherwise generates a strong random secret once
 * and stores it in server/.jwt_secret (git-ignored), so local development
 * doesn't need configuration and logins survive server restarts.
 * In production, set JWT_SECRET explicitly.
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { JWT_SECRET, NODE_ENV } = require('./env');

const SECRET_FILE = path.resolve(__dirname, '../../.jwt_secret');

function resolveSecret() {
  if (JWT_SECRET) return JWT_SECRET;
  if (NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production.');
  }
  try {
    const existing = fs.readFileSync(SECRET_FILE, 'utf8').trim();
    if (existing.length >= 32) return existing;
  } catch { /* not created yet */ }

  const secret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
  console.log('[auth] Generated a local JWT secret in server/.jwt_secret');
  return secret;
}

const secret = resolveSecret();

module.exports = { getJwtSecret: () => secret };
