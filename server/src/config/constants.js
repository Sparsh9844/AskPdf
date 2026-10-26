'use strict';

// Document processing pipeline stages (ordered)
const STAGES = Object.freeze([
  'uploading',
  'parsing',
  'chunking',
  'embedding',
  'indexing',
  'analyzing',
  'completed',
]);

// Redis key helpers
const REDIS_KEYS = {
  docChunks: (docId) => `doc:${docId}:chunks`,        // JSON array of chunk objects
  docIndex:  (docId) => `doc:${docId}:index`,          // Hash: chunkIdx → embedding JSON
  sseClients: (docId) => `sse:${docId}`,               // SSE channel key (pub/sub)
};

// SSE heartbeat interval (ms)
const SSE_HEARTBEAT_MS = 15_000;

// Processing stage → progress percentage (used in SSE events)
const STAGE_PCT = Object.freeze({
  uploading:  5,
  parsing:    20,
  chunking:   40,
  embedding:  60,
  indexing:   80,
  analyzing:  90,
  completed:  100,
});

module.exports = { STAGES, REDIS_KEYS, SSE_HEARTBEAT_MS, STAGE_PCT };
