'use strict';

/**
 * qdrant.js — Qdrant client singleton + collection bootstrap
 *
 * Supports both:
 *   • Local Docker:  QDRANT_URL=http://localhost:6333  (no API key)
 *   • Qdrant Cloud:  QDRANT_URL=https://xxx.qdrant.io  QDRANT_API_KEY=<key>
 *
 * Call ensureCollection() once at server startup.
 * Call getQdrant() anywhere to get the client instance.
 */

const { QdrantClient } = require('@qdrant/js-client-rest');
const { QDRANT_URL, QDRANT_API_KEY, QDRANT_COLLECTION, EMBED_DIM, NODE_ENV } =
  require('./env');

let client = null;

/** Return the shared QdrantClient instance (lazy-init). */
function getQdrant() {
  if (client) return client;

  const opts = { url: QDRANT_URL };
  if (QDRANT_API_KEY) opts.apiKey = QDRANT_API_KEY;

  client = new QdrantClient(opts);
  return client;
}

/**
 * Ensure the collection exists with the correct vector config.
 * Safe to call on every startup — no-ops if the collection already exists.
 */
async function ensureCollection() {
  const q = getQdrant();

  // Check whether collection already exists
  const { collections } = await q.getCollections();
  const exists = collections.some(c => c.name === QDRANT_COLLECTION);

  if (!exists) {
    await q.createCollection(QDRANT_COLLECTION, {
      vectors: {
        size:     EMBED_DIM,   // 384 for Xenova/all-MiniLM-L6-v2
        distance: 'Cosine',
      },
      // Optimiser settings — good defaults for a RAG workload
      optimizers_config: {
        indexing_threshold: 1000,   // build HNSW index after 1 000 vectors
      },
      // Named payload index for fast docId filtering
    });

    // Create payload index on documentId so filtered searches are fast
    await q.createPayloadIndex(QDRANT_COLLECTION, {
      field_name: 'documentId',
      field_schema: 'keyword',
      wait: true,
    });

    if (NODE_ENV !== 'test') {
      console.log(
        `[Qdrant] Collection "${QDRANT_COLLECTION}" created ` +
        `(dim=${EMBED_DIM}, distance=Cosine)`
      );
    }
  } else {
    // Catch the most common misconfiguration early: a collection created with
    // a different vector size than the embedder produces.
    const info = await q.getCollection(QDRANT_COLLECTION);
    const size = info?.config?.params?.vectors?.size;
    if (size && size !== EMBED_DIM) {
      throw new Error(
        `Qdrant collection "${QDRANT_COLLECTION}" has vector size ${size}, ` +
        `but EMBED_DIM is ${EMBED_DIM}. Use a new QDRANT_COLLECTION name or fix EMBED_DIM.`
      );
    }
    if (NODE_ENV !== 'test') {
      console.log(`[Qdrant] Collection "${QDRANT_COLLECTION}" ready`);
    }
  }
}

module.exports = { getQdrant, ensureCollection };
