'use strict';

require('express-async-errors');   // patches Router to forward async errors automatically

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const path        = require('path');

const { FRONTEND_URL, RATE_LIMIT_MAX, NODE_ENV } = require('./config/env');
const { activeBackend } = require('./services/vectorStore');

const documentRoutes     = require('./routes/documents');
const conversationRoutes = require('./routes/conversations');
const messageRoutes      = require('./routes/messages');
const statsRoutes        = require('./routes/stats');
const noteRoutes         = require('./routes/notes');
const verifyRoutes       = require('./routes/verify');
const authRoutes         = require('./routes/auth');
const { requireAuth }    = require('./middleware/auth');

const errorHandler = require('./middleware/errorHandler');
const notFound     = require('./middleware/notFound');

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({
  // Allow the front end's fetch calls
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use(
  '/api/',
  rateLimit({
    windowMs: 60 * 1000,       // 1 minute
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again shortly.', status: 429 },
  })
);

// ── Compression ───────────────────────────────────────────────────────────────
// gzip JSON/Markdown responses; never SSE, which must stream unbuffered
app.use(compression({
  filter: (req, res) =>
    !String(res.getHeader('Content-Type') ?? '').includes('text/event-stream') &&
    !req.path.endsWith('/stream') &&
    compression.filter(req, res),
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Request logging ───────────────────────────────────────────────────────────
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', vectorStore: activeBackend(), timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────────────────────────
// Public
app.use('/api/auth',         authRoutes);

// Everything below requires a signed-in user and is scoped to them
app.use('/api/documents',     requireAuth, documentRoutes);
app.use('/api/stats',         requireAuth, statsRoutes);
app.use('/api/conversations', requireAuth, conversationRoutes);
app.use('/api/notes',         requireAuth, noteRoutes);
app.use('/api/verify',        requireAuth, verifyRoutes);

// Nested: /api/conversations/:conversationId/messages
app.use('/api/conversations/:conversationId/messages', requireAuth, messageRoutes);

// ── 404 + global error handler ────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
