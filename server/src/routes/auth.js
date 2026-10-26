'use strict';

/**
 * Auth routes — local email/password accounts stored in MongoDB.
 *
 * POST  /api/auth/register   { name, email, password } → { token, user }
 * POST  /api/auth/login      { email, password }       → { token, user }
 * GET   /api/auth/me                                   → user
 * PATCH /api/auth/me         { name }                  → user
 * POST  /api/auth/password   { currentPassword, newPassword }
 */

const router    = require('express').Router();
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const User         = require('../models/User');
const Document     = require('../models/Document');
const Conversation = require('../models/Conversation');
const Message      = require('../models/Message');
const Note         = require('../models/Note');
const ApiError     = require('../utils/apiError');
const { requireAuth }  = require('../middleware/auth');
const { getJwtSecret } = require('../config/auth');
const { JWT_EXPIRES_IN } = require('../config/env');

const BCRYPT_ROUNDS = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Slow down password guessing: 20 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.', status: 429 },
});

const signToken = (user) =>
  jwt.sign({ sub: user._id.toString() }, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8)
    throw ApiError.badRequest('Password must be at least 8 characters.');
  if (password.length > 128)
    throw ApiError.badRequest('Password is too long (max 128 characters).');
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    throw ApiError.badRequest('Password must contain at least one letter and one number.');
}

/**
 * Data created before accounts existed has no owner. The first account to
 * register claims it, so an existing single-user install keeps its library.
 */
async function claimLegacyData(userId) {
  const unowned = { $or: [{ owner: { $exists: false } }, { owner: null }] };
  const [docs, convs, msgs, notes] = await Promise.all([
    Document.updateMany(unowned, { owner: userId }),
    Conversation.updateMany(unowned, { owner: userId }),
    Message.updateMany(unowned, { owner: userId }),
    Note.updateMany(unowned, { owner: userId }),
  ]);
  const total = docs.modifiedCount + convs.modifiedCount + msgs.modifiedCount + notes.modifiedCount;
  if (total) {
    console.log(`[auth] First account claimed existing data: ${docs.modifiedCount} documents, ` +
      `${convs.modifiedCount} conversations, ${notes.modifiedCount} notes`);
  }
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!name?.trim()) throw ApiError.badRequest('Please enter your name.');
  if (!email || !EMAIL_RE.test(String(email).trim())) throw ApiError.badRequest('Please enter a valid email address.');
  validatePassword(password);

  const normalised = String(email).trim().toLowerCase();
  if (await User.exists({ email: normalised }))
    throw ApiError.conflict('An account with this email already exists. Try signing in.');

  const isFirst = (await User.estimatedDocumentCount()) === 0;
  const user = await User.create({
    name:         String(name).trim().slice(0, 80),
    email:        normalised,
    passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    lastLoginAt:  new Date(),
  });

  if (isFirst) await claimLegacyData(user._id);

  res.status(201).json({ token: signToken(user), user });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) throw ApiError.badRequest('Email and password are required.');

  const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+passwordHash');
  // Same message either way — don't reveal which emails have accounts
  const ok = user && await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) throw new ApiError(401, 'Incorrect email or password.');

  user.lastLoginAt = new Date();
  await user.save();

  res.json({ token: signToken(user), user });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

// ── PATCH /api/auth/me ────────────────────────────────────────────────────────
router.patch('/me', requireAuth, async (req, res) => {
  const { name } = req.body ?? {};
  if (!name?.trim()) throw ApiError.badRequest('Name cannot be empty.');
  req.user.name = String(name).trim().slice(0, 80);
  await req.user.save();
  res.json(req.user);
});

// ── POST /api/auth/password ───────────────────────────────────────────────────
router.post('/password', authLimiter, requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  const user = await User.findById(req.userId).select('+passwordHash');
  if (!currentPassword || !(await bcrypt.compare(String(currentPassword), user.passwordHash)))
    throw ApiError.badRequest('Current password is incorrect.');
  validatePassword(newPassword);

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await user.save();
  res.json({ ok: true });
});

module.exports = router;
