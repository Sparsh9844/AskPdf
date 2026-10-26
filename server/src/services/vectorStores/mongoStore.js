'use strict';

/**
 * mongoStore.js — MongoDB vector search backend
 *
 * Stores each chunk with its embedding in the `chunks` collection and ranks
 * by cosine similarity in Node. Embeddings are L2-normalised by the embedder,
 * so cosine similarity is a plain dot product.
 *
 * Brute force is fast at this scale (384-dim vectors, thousands of chunks):
 * a document's vectors are loaded once and cached in memory as Float32Arrays.
 * No extra infrastructure needed — it uses the MongoDB the app already has.
 */

const Chunk = require('../../models/Chunk');
const { TOP_K } = require('../../config/env');

// docId → { meta: object[], vectors: Float32Array[] }
const cache = new Map();

async function loadDocument(docId) {
  if (cache.has(docId)) return cache.get(docId);
  const rows = await Chunk.find({ documentId: docId }).sort({ chunkIndex: 1 }).lean();
  const entry = {
    meta:    rows.map(({ embedding: _e, _id, ...m }) => ({ ...m, documentId: docId })),
    vectors: rows.map(r => Float32Array.from(r.embedding)),
  };
  cache.set(docId, entry);
  return entry;
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Replace all chunks for a document. */
async function indexDocument(docId, chunks, embeddings) {
  await Chunk.deleteMany({ documentId: docId });
  const docs = chunks.map((c, i) => ({
    documentId: docId,
    chunkIndex: c.index,
    text:       c.text,
    pageNumber: c.pageNumber ?? 1,
    pageEnd:    c.pageEnd ?? c.pageNumber ?? 1,
    charStart:  c.charStart ?? 0,
    charEnd:    c.charEnd   ?? 0,
    embedding:  Array.from(embeddings[i]),
  }));
  const BATCH = 200;
  for (let i = 0; i < docs.length; i += BATCH) {
    await Chunk.insertMany(docs.slice(i, i + BATCH), { ordered: false });
  }
  cache.delete(docId);
}

/** Top-k chunks across the given documents, by cosine similarity. */
async function queryDocuments(docIds, queryEmbedding, k = TOP_K) {
  const q = Float32Array.from(queryEmbedding);
  const scored = [];
  for (const docId of docIds) {
    const { meta, vectors } = await loadDocument(docId);
    for (let i = 0; i < vectors.length; i++) {
      scored.push({ docMeta: meta[i], score: dot(q, vectors[i]) });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map(({ docMeta, score }) => ({
    documentId: docMeta.documentId,
    text:       docMeta.text,
    pageNumber: docMeta.pageNumber,
    pageEnd:    docMeta.pageEnd ?? docMeta.pageNumber,
    chunkIndex: docMeta.chunkIndex,
    charStart:  docMeta.charStart,
    charEnd:    docMeta.charEnd,
    score:      Math.round(score * 1000) / 1000,
  }));
}

async function deleteDocument(docId) {
  await Chunk.deleteMany({ documentId: docId });
  cache.delete(docId);
}

async function hasDocument(docId) {
  if (cache.get(docId)?.vectors.length) return true;
  return !!(await Chunk.exists({ documentId: docId }));
}

module.exports = {
  name: 'mongodb',
  init: async () => { await Chunk.init(); },   // builds the unique index
  indexDocument,
  queryDocuments,
  deleteDocument,
  hasDocument,
};
