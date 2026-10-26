'use strict';

/**
 * vectorStore.js — picks a vector backend and keeps it in sync with documents.
 *
 * Backends (services/vectorStores/):
 *   qdrant   — dedicated vector database (local Docker or Qdrant Cloud)
 *   mongodb  — chunks + embeddings in MongoDB, cosine ranking in Node
 *
 * VECTOR_STORE=auto (default) uses Qdrant when it is reachable at startup and
 * falls back to MongoDB otherwise, so the app never fails to boot because the
 * vector database is down or blocked by the network.
 *
 * Self-healing: before a document is searched, the active backend is checked
 * for its vectors. If they are missing (e.g. the document was indexed while a
 * different backend was active), it is re-indexed from the uploaded file.
 */

const Document      = require('../models/Document');
const { parseDocument } = require('../utils/documentParser');
const { chunkPages }    = require('../utils/chunker');
const { embedBatch }    = require('./embedder');
const { VECTOR_STORE, QDRANT_URL, NODE_ENV } = require('../config/env');

const QDRANT_TIMEOUT_MS = 8000;

let backend = null;
const indexed  = new Set();   // docIds confirmed present in the active backend
const inflight = new Map();   // docId → re-index promise

const log = (...args) => { if (NODE_ENV !== 'test') console.log('[vectorStore]', ...args); };

function withTimeout(promise, ms, label) {
  let t;
  return Promise.race([
    promise,
    new Promise((_, reject) => { t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms); }),
  ]).finally(() => clearTimeout(t));
}

const describe = (err) => err?.cause?.code ?? err?.code ?? err?.message ?? String(err);

/**
 * Choose and initialise the backend. Call once at startup, after MongoDB connects.
 * @returns {Promise<string>} active backend name
 */
async function initVectorStore() {
  const mode = VECTOR_STORE;
  if (!['auto', 'qdrant', 'mongodb'].includes(mode)) {
    throw new Error(`VECTOR_STORE must be auto, qdrant or mongodb (got "${mode}")`);
  }

  if (mode !== 'mongodb' && QDRANT_URL) {
    const qdrant = require('./vectorStores/qdrantStore');
    try {
      await withTimeout(qdrant.init(), QDRANT_TIMEOUT_MS, 'Qdrant connection');
      backend = qdrant;
    } catch (err) {
      if (mode === 'qdrant') throw err;
      console.warn(
        `[vectorStore] Qdrant unreachable at ${QDRANT_URL} (${describe(err)}).\n` +
        '              Falling back to the MongoDB vector store. Set VECTOR_STORE=mongodb to skip this check.'
      );
    }
  } else if (mode === 'qdrant') {
    throw new Error('VECTOR_STORE=qdrant requires QDRANT_URL.');
  }

  if (!backend) {
    backend = require('./vectorStores/mongoStore');
    await backend.init();
  }

  log(`Using ${backend.name} backend`);
  return backend.name;
}

function active() {
  if (!backend) throw new Error('Vector store not initialised — call initVectorStore() first.');
  return backend;
}

/**
 * Re-index a completed document from its file into the active backend.
 * Deduplicates concurrent calls for the same document.
 */
function reindexFromFile(docId) {
  if (inflight.has(docId)) return inflight.get(docId);

  const job = (async () => {
    const doc = await Document.findById(docId);
    if (!doc || doc.status !== 'completed') return false;

    const t0 = Date.now();
    const { pageTexts } = await parseDocument(doc.filePath);
    const chunks = chunkPages(pageTexts);
    if (chunks.length === 0) return false;
    const embeddings = await embedBatch(chunks.map(c => c.text));
    await active().indexDocument(docId, chunks, embeddings);
    await Document.findByIdAndUpdate(docId, { chunks: chunks.length, embeddings: embeddings.length });

    indexed.add(docId);
    log(`Re-indexed "${doc.name}" into ${active().name} (${chunks.length} chunks, ${Date.now() - t0}ms)`);
    return true;
  })().finally(() => inflight.delete(docId));

  inflight.set(docId, job);
  return job;
}

/** Make sure a document's vectors exist in the active backend. */
async function ensureIndexed(docId) {
  if (indexed.has(docId)) return;
  if (inflight.has(docId)) { await inflight.get(docId); return; }
  if (await active().hasDocument(docId)) { indexed.add(docId); return; }
  try {
    await reindexFromFile(docId);
  } catch (err) {
    console.error(`[vectorStore] Could not re-index ${docId}:`, err.message);
  }
}

/**
 * Background pass at startup: re-index every completed document that is
 * missing from the active backend, so first questions are fast.
 */
async function backfill() {
  const docs = await Document.find({ status: 'completed' }).select('_id').lean();
  for (const d of docs) await ensureIndexed(d._id.toString());
}

// ── Public API (unchanged for callers) ────────────────────────────────────────

async function indexDocument(docId, chunks, embeddings) {
  await active().indexDocument(docId, chunks, embeddings);
  indexed.add(docId);
}

async function queryDocuments(docIds, queryEmbedding, k) {
  await Promise.all(docIds.map(ensureIndexed));
  return active().queryDocuments(docIds, queryEmbedding, k);
}

async function deleteDocument(docId) {
  indexed.delete(docId);
  await active().deleteDocument(docId);
}

module.exports = {
  initVectorStore,
  backfill,
  ensureIndexed,
  indexDocument,
  queryDocuments,
  deleteDocument,
  activeBackend: () => backend?.name ?? null,
};
