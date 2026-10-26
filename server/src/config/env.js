'use strict';

require('dotenv').config();

const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env variable: ${key}`);
  return val;
};

const optional = (key, fallback) => process.env[key] ?? fallback;

module.exports = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT:     parseInt(optional('PORT', '5000'), 10),

  // ── MongoDB ───────────────────────────────────────────────────────────────
  // Stores: Document metadata, Conversations, Messages.
  // Does NOT store vectors — that is Qdrant's job.
  MONGO_URI: required('MONGO_URI'),
  // Public DNS used when the system resolver can't look up a mongodb+srv://
  // address (common with home routers). Comma-separated.
  DNS_FALLBACK_SERVERS: optional('DNS_FALLBACK_SERVERS', '8.8.8.8,1.1.1.1')
    .split(',').map(s => s.trim()).filter(Boolean),

  // ── Vector store ──────────────────────────────────────────────────────────
  // auto    — Qdrant if reachable at startup, otherwise MongoDB (default)
  // qdrant  — Qdrant only; fail to start if unreachable
  // mongodb — store embeddings in MongoDB; no Qdrant needed
  VECTOR_STORE: optional('VECTOR_STORE', 'auto').toLowerCase(),

  // ── Qdrant (optional) ─────────────────────────────────────────────────────
  // Local Docker : http://localhost:6333   (no API key needed)
  // Qdrant Cloud : https://xxx.qdrant.io   (API key required)
  QDRANT_URL:        optional('QDRANT_URL', null),
  QDRANT_API_KEY:    optional('QDRANT_API_KEY', null),   // null = local / no auth
  QDRANT_COLLECTION: optional('QDRANT_COLLECTION', 'askpdf_chunks'),

  // ── Redis (optional) ──────────────────────────────────────────────────────
  // Not used for vector search. Leave blank to disable.
  REDIS_URL: optional('REDIS_URL', null),

  // ── Groq ──────────────────────────────────────────────────────────────────
  GROQ_API_KEY:     required('GROQ_API_KEY'),
  GROQ_MODEL:       optional('GROQ_MODEL', 'qwen/qwen3.8-27b'),
  // Optional faster model for the research engine's helper steps
  // (query rewriting, planning, follow-ups, titles). Defaults to GROQ_MODEL.
  GROQ_FAST_MODEL:  optional('GROQ_FAST_MODEL', optional('GROQ_MODEL', 'qwen/qwen3.8-27b')),
  // Embeddings use @xenova/transformers locally — no API key needed.
  // GROQ_EMBED_MODEL kept for reference only (not used at runtime).
  GROQ_EMBED_MODEL: optional('GROQ_EMBED_MODEL', 'Xenova/all-MiniLM-L6-v2'),

  // ── Embedding dimension ───────────────────────────────────────────────────
  // MUST match the local embedding model AND the Qdrant collection vector size.
  // Xenova/all-MiniLM-L6-v2 (the default embedder) → 384
  EMBED_DIM: parseInt(optional('EMBED_DIM', '384'), 10),

  // ── File uploads ──────────────────────────────────────────────────────────
  UPLOAD_DIR:       optional('UPLOAD_DIR',       'uploads'),
  MAX_FILE_SIZE_MB: parseInt(optional('MAX_FILE_SIZE_MB', '50'), 10),

  // ── RAG tunables ──────────────────────────────────────────────────────────
  CHUNK_SIZE:    parseInt(optional('CHUNK_SIZE',    '800'), 10),
  CHUNK_OVERLAP: parseInt(optional('CHUNK_OVERLAP', '150'), 10),
  TOP_K:         parseInt(optional('TOP_K',         '5'),   10),
  // Max answer length (tokens). Lower these on Groq's free tier, which caps
  // output tokens per minute and reserves max_tokens up front.
  ANSWER_MAX_TOKENS:      parseInt(optional('ANSWER_MAX_TOKENS',      '1024'), 10),
  DEEP_ANSWER_MAX_TOKENS: parseInt(optional('DEEP_ANSWER_MAX_TOKENS', '2048'), 10),

  // ── Auth ──────────────────────────────────────────────────────────────────
  // Secret for signing session tokens. If unset, one is generated on first
  // start and saved to server/.jwt_secret so sessions survive restarts.
  JWT_SECRET:     optional('JWT_SECRET', null),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '7d'),

  // ── Security ──────────────────────────────────────────────────────────────
  FRONTEND_URL:   optional('FRONTEND_URL',   'http://localhost:5174'),
  RATE_LIMIT_MAX: parseInt(optional('RATE_LIMIT_MAX', '100'), 10),
};
