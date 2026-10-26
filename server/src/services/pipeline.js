'use strict';

/**
 * pipeline.js
 *
 * Orchestrates the full ingestion flow for a single document:
 *
 *   uploading  (done by the time we are called)
 *       ↓
 *   parsing    — extract text per page
 *       ↓
 *   chunking   — split into overlapping segments, each mapped to its real page
 *       ↓
 *   embedding  — generate vector embeddings (local transformers.js)
 *       ↓
 *   indexing   — upsert chunks + embeddings into Qdrant
 *       ↓
 *   analyzing  — LLM writes an intelligence brief (summary, key points,
 *                entities, figures, suggested questions). Non-fatal.
 *       ↓
 *   completed  (or error)
 *
 * Progress is broadcast via the sseManager so the frontend progress bar
 * updates in real time.
 */

const Document          = require('../models/Document');
const { parseDocument } = require('../utils/documentParser');
const { chunkPages, normalise } = require('../utils/chunker');
const { embedBatch }    = require('./embedder');
const { indexDocument } = require('./vectorStore');
const { generateBrief } = require('./llm');
const { STAGE_PCT }     = require('../config/constants');

const BRIEF_SAMPLE_CHARS = 14_000;

/**
 * Build a representative, page-tagged sample of a document for the brief:
 * the opening pages in full, then evenly spaced excerpts from the rest.
 *
 * @param {string[]} pageTexts
 * @returns {string}
 */
function buildSample(pageTexts) {
  const pages = pageTexts.map((t, i) => ({ n: i + 1, text: normalise(t) })).filter(p => p.text);
  const total = pages.reduce((s, p) => s + p.text.length, 0);
  if (total <= BRIEF_SAMPLE_CHARS) {
    return pages.map(p => `[Page ${p.n}]\n${p.text}`).join('\n\n');
  }

  const parts = [];
  let budget = BRIEF_SAMPLE_CHARS;

  // Opening ~35% of budget: first pages usually hold title, abstract, summary
  const headBudget = Math.floor(BRIEF_SAMPLE_CHARS * 0.35);
  let i = 0;
  for (let used = 0; i < pages.length && used < headBudget; i++) {
    const take = pages[i].text.slice(0, headBudget - used);
    parts.push(`[Page ${pages[i].n}]\n${take}`);
    used += take.length;
    budget -= take.length;
  }

  // Remaining budget spread across evenly spaced later pages
  const rest = pages.slice(i);
  const slots = Math.min(rest.length, 12);
  const per = Math.floor(budget / Math.max(1, slots));
  for (let k = 0; k < slots; k++) {
    const p = rest[Math.floor((k * rest.length) / slots)];
    parts.push(`[Page ${p.n}]\n${p.text.slice(0, per)}`);
  }
  return parts.join('\n\n');
}

/**
 * Generate (or regenerate) the brief for a document and persist it.
 * Never throws — failures are recorded on the document as briefError.
 *
 * @param {string}   docId
 * @param {string}   name
 * @param {string[]} pageTexts
 * @returns {Promise<object|null>} the brief, or null on failure
 */
async function analyzeDocument(docId, name, pageTexts) {
  try {
    const brief = await generateBrief(name, buildSample(pageTexts));
    await Document.findByIdAndUpdate(docId, { brief, briefError: null });
    return brief;
  } catch (err) {
    console.error(`[pipeline] Brief generation failed for ${docId}:`, err.message);
    await Document.findByIdAndUpdate(docId, { briefError: err.message });
    return null;
  }
}

/**
 * Run the full ingestion pipeline for a document.
 *
 * @param {string}  docId       Mongo Document _id string
 * @param {string}  filePath    Absolute path to the file on disk
 * @param {object}  sseManager  { emit(docId, event, payload) }
 */
async function runPipeline(docId, filePath, sseManager) {
  const emit = (stage, extra = {}) => {
    sseManager.emit(docId, 'progress', {
      stage,
      pct: STAGE_PCT[stage],
      ...extra,
    });
  };

  try {
    // ── 1. Parsing ────────────────────────────────────────────────────────────
    const doc = await Document.findByIdAndUpdate(docId, { status: 'parsing' }).select('name');
    emit('parsing');

    const { text, pages, pageTexts } = await parseDocument(filePath);
    const wordCount = (text.match(/\S+/g) ?? []).length;

    if (!text.trim()) {
      throw new Error(
        'No extractable text found. The file may be scanned images — OCR is not supported yet.'
      );
    }

    // ── 2. Chunking ───────────────────────────────────────────────────────────
    await Document.findByIdAndUpdate(docId, { pages, wordCount, status: 'chunking' });
    emit('chunking');

    const chunks = chunkPages(pageTexts);

    // ── 3. Embedding ──────────────────────────────────────────────────────────
    await Document.findByIdAndUpdate(docId, { chunks: chunks.length, status: 'embedding' });
    emit('embedding', { chunks: chunks.length });

    const embeddings = await embedBatch(chunks.map(c => c.text));

    // ── 4. Indexing — upsert vectors into Qdrant ──────────────────────────────
    await Document.findByIdAndUpdate(docId, { embeddings: embeddings.length, status: 'indexing' });
    emit('indexing', { embeddings: embeddings.length });

    await indexDocument(docId, chunks, embeddings);

    // ── 5. Analyzing — intelligence brief (non-fatal) ─────────────────────────
    await Document.findByIdAndUpdate(docId, { status: 'analyzing' });
    emit('analyzing');

    await analyzeDocument(docId, doc?.name ?? 'Document', pageTexts);

    // ── 6. Completed ──────────────────────────────────────────────────────────
    await Document.findByIdAndUpdate(docId, { status: 'completed' });
    emit('completed');

    sseManager.emit(docId, 'done', { docId });

  } catch (err) {
    console.error(`[pipeline] Error processing document ${docId}:`, err.message);

    await Document.findByIdAndUpdate(docId, {
      status: 'error',
      errorMessage: err.message,
    });

    sseManager.emit(docId, 'error', { message: err.message });
  }
}

module.exports = { runPipeline, analyzeDocument, buildSample };
