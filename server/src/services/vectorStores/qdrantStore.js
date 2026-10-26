'use strict';

/**
 * qdrantStore.js — Qdrant vector search backend
 *
 * Point ID strategy
 * ─────────────────
 * Each chunk gets a deterministic UUID derived from docId + chunkIndex.
 * This means re-indexing the same document simply overwrites existing points
 * via upsert — no pre-delete needed, which avoids Qdrant Cloud strict mode
 * issues with filter-based deletes on empty collections.
 *
 * deleteDocument uses scroll + delete-by-IDs (fetches IDs page by page)
 * so it never issues a filter-based delete write operation.
 */

const { getQdrant, ensureCollection } = require('../../config/qdrant');
const { QDRANT_COLLECTION, TOP_K } = require('../../config/env');

// ── Deterministic point-id ────────────────────────────────────────────────────
/**
 * Build a stable UUID from docId (Mongo ObjectId, 24 hex chars) + chunkIndex.
 * Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *
 * @param {string} docId       24-char hex Mongo ObjectId
 * @param {number} chunkIndex
 * @returns {string}
 */
function pointId(docId, chunkIndex) {
  // Pad index to 8 hex chars, combine with last 24 chars of docId
  const idx  = chunkIndex.toString(16).padStart(8, '0');
  const base = docId.padStart(24, '0');
  // Build 32 hex chars total then format as UUID
  const raw  = (idx + base).slice(0, 32);
  return [
    raw.slice(0,  8),
    raw.slice(8,  12),
    raw.slice(12, 16),
    raw.slice(16, 20),
    raw.slice(20, 32),
  ].join('-');
}

// ── indexDocument ─────────────────────────────────────────────────────────────
/**
 * Upsert all chunk vectors for a document into Qdrant.
 * Uses deterministic point IDs so re-runs simply overwrite — no pre-delete.
 *
 * @param {string}     docId
 * @param {{ index:number, text:string, charStart?:number, charEnd?:number,
 *           pageNumber?:number, pageEnd?:number }[]} chunks
 * @param {number[][]} embeddings  parallel array
 */
async function indexDocument(docId, chunks, embeddings) {
  const q = getQdrant();

  const points = chunks.map((c, i) => ({
    id:      pointId(docId, c.index),
    vector:  Array.from(embeddings[i]),   // ensure plain number[]
    payload: {
      documentId: docId,
      chunkIndex: c.index,
      text:       c.text,
      pageNumber: c.pageNumber ?? 1,
      pageEnd:    c.pageEnd ?? c.pageNumber ?? 1,
      charStart:  c.charStart ?? 0,
      charEnd:    c.charEnd   ?? 0,
    },
  }));

  // Upsert in batches of 100 to stay within request size limits
  const BATCH = 100;
  for (let i = 0; i < points.length; i += BATCH) {
    await q.upsert(QDRANT_COLLECTION, {
      wait:   true,
      points: points.slice(i, i + BATCH),
    });
  }
}

// ── queryDocuments ────────────────────────────────────────────────────────────
/**
 * Return the top-K chunks most similar to a query embedding,
 * filtered to one or more documents.
 *
 * @param {string[]} docIds
 * @param {number[]} queryEmbedding
 * @param {number}   [k]
 * @returns {Promise<{ documentId:string, text:string, pageNumber:number, pageEnd:number,
 *                     chunkIndex:number, score:number }[]>}
 */
async function queryDocuments(docIds, queryEmbedding, k = TOP_K) {
  const q = getQdrant();

  const response = await q.query(QDRANT_COLLECTION, {
    query:        Array.from(queryEmbedding),
    limit:        k,
    with_payload: true,
    with_vectors: false,
    filter: {
      must: [{ key: 'documentId', match: { any: docIds } }],
    },
  });

  // SDK v1.10+ wraps results in response.points
  const points = response.points ?? response;

  return points.map(r => ({
    documentId: r.payload.documentId,
    text:       r.payload.text,
    pageNumber: r.payload.pageNumber,
    pageEnd:    r.payload.pageEnd ?? r.payload.pageNumber,
    chunkIndex: r.payload.chunkIndex,
    charStart:  r.payload.charStart,
    charEnd:    r.payload.charEnd,
    score:      Math.round((r.score ?? 0) * 1000) / 1000,
  }));
}

// ── deleteDocument ────────────────────────────────────────────────────────────
/**
 * Delete all points for a document.
 *
 * Uses scroll (read) to collect point IDs, then deletes by ID list.
 * This avoids filter-based delete writes which require strict mode
 * to be disabled on Qdrant Cloud.
 *
 * @param {string} docId
 * @param {number} [chunkCount]  if known, skip scroll and compute IDs directly
 */
async function deleteDocument(docId, chunkCount) {
  const q = getQdrant();

  let idsToDelete = [];

  if (typeof chunkCount === 'number' && chunkCount > 0) {
    // Fast path: reconstruct IDs deterministically — no round-trip needed
    for (let i = 0; i < chunkCount; i++) {
      idsToDelete.push(pointId(docId, i));
    }
  } else {
    // Scroll path: page through all points matching this docId
    let offset = null;
    const PAGE = 100;

    do {
      const page = await q.scroll(QDRANT_COLLECTION, {
        filter:       { must: [{ key: 'documentId', match: { value: docId } }] },
        limit:        PAGE,
        offset:       offset ?? undefined,
        with_payload: false,
        with_vectors: false,
      });

      idsToDelete.push(...page.points.map(p => p.id));
      offset = page.next_page_offset ?? null;
    } while (offset !== null);
  }

  // Delete by explicit ID list (no filter-based write — works in strict mode)
  if (idsToDelete.length > 0) {
    const BATCH = 100;
    for (let i = 0; i < idsToDelete.length; i += BATCH) {
      await q.delete(QDRANT_COLLECTION, {
        wait:   true,
        points: idsToDelete.slice(i, i + BATCH),
      });
    }
  }
}

// ── hasDocument ───────────────────────────────────────────────────────────────
/** Whether any vectors exist for this document. */
async function hasDocument(docId) {
  const { count } = await getQdrant().count(QDRANT_COLLECTION, {
    filter: { must: [{ key: 'documentId', match: { value: docId } }] },
    exact:  false,
  });
  return count > 0;
}

module.exports = {
  name: 'qdrant',
  init: ensureCollection,
  indexDocument,
  queryDocuments,
  deleteDocument,
  hasDocument,
};
