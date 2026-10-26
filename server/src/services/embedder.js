'use strict';

/**
 * embedder.js — Local embedding using @xenova/transformers
 *
 * Runs the embedding model ENTIRELY IN NODE.JS — no API key, no rate limits,
 * no external service needed. The model (~22 MB) is downloaded once and cached.
 *
 * Model  : Xenova/all-MiniLM-L6-v2  (dim = 384)
 * Cache  : ~/.cache/huggingface/hub  (auto-managed by transformers.js)
 *
 * NOTE: EMBED_DIM in .env must be set to 384 to match this model.
 *       Qdrant collection will be recreated automatically if it doesn't exist.
 *
 * Upgrade path: swap MODEL_NAME for a larger model (e.g. Xenova/nomic-embed-text-v1)
 * and update EMBED_DIM accordingly.
 */

const { EMBED_DIM, NODE_ENV } = require('../config/env');

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';   // 384-dim, ~22 MB, fast

// Singleton pipeline — loaded once on first call
let _pipeline = null;

async function getPipeline() {
  if (_pipeline) return _pipeline;

  // Dynamic import — @xenova/transformers is an ESM package
  const { pipeline, env } = await import('@xenova/transformers');

  // Silence download progress logs in production
  if (NODE_ENV === 'production') env.allowLocalModels = false;

  _pipeline = await pipeline('feature-extraction', MODEL_NAME, {
    quantized: true,   // use quantized model for faster load + smaller size
  });

  console.log(`[embedder] Model "${MODEL_NAME}" loaded (dim=${EMBED_DIM})`);
  return _pipeline;
}

// ── embedText ─────────────────────────────────────────────────────────────────
/**
 * Generate a single normalised embedding vector.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function embedText(text) {
  const pipe = await getPipeline();

  const output = await pipe(text, {
    pooling:   'mean',
    normalize: true,
  });

  // output.data is a Float32Array — convert to plain number[]
  return Array.from(output.data);
}

// ── embedBatch ────────────────────────────────────────────────────────────────
/**
 * Embed an array of texts sequentially (transformers.js is CPU-bound).
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
async function embedBatch(texts) {
  const results = [];
  for (const text of texts) {
    results.push(await embedText(text));
  }
  return results;
}

// ── cosineSimilarity ──────────────────────────────────────────────────────────
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

module.exports = { embedText, embedBatch, cosineSimilarity, EMBED_DIM };
