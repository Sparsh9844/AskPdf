'use strict';

const { CHUNK_SIZE, CHUNK_OVERLAP } = require('../config/env');

/**
 * Normalise whitespace — collapse 3+ newlines to 2 and trailing spaces.
 * @param {string} text
 */
function normalise(text) {
  return (text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Split a long text into overlapping chunks, tracking exact character offsets.
 *
 * Strategy:
 *  1. Prefer splitting on paragraph breaks (\n\n), then sentence ends, then words.
 *  2. Each chunk is at most chunkSize characters.
 *  3. Adjacent chunks share ~overlap characters so context isn't lost at boundaries.
 *
 * @param {string} text           Full (already normalised) text
 * @param {number} [chunkSize]
 * @param {number} [overlap]
 * @returns {{ index: number, text: string, charStart: number, charEnd: number }[]}
 */
function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  if (!text || !text.trim()) return [];

  const src    = text;
  const chunks = [];
  const lookback = Math.floor(chunkSize * 0.2);
  let pos = 0;

  while (pos < src.length) {
    let end = pos + chunkSize;

    if (end >= src.length) {
      end = src.length;
    } else {
      const paraBreak = src.lastIndexOf('\n\n', end);
      if (paraBreak > end - lookback) {
        end = paraBreak;
      } else {
        // Last sentence end inside the lookback window
        const region = src.slice(end - lookback, end);
        let sentIdx = -1;
        const re = /[.!?]\s/g;
        let m;
        while ((m = re.exec(region)) !== null) sentIdx = m.index;
        if (sentIdx !== -1) {
          end = end - lookback + sentIdx + 1;
        } else {
          const spaceIdx = src.lastIndexOf(' ', end);
          if (spaceIdx > pos) end = spaceIdx;
        }
      }
    }

    // Trim while keeping exact offsets
    let s = pos, e = end;
    while (s < e && /\s/.test(src[s])) s++;
    while (e > s && /\s/.test(src[e - 1])) e--;
    if (e > s) chunks.push({ text: src.slice(s, e), charStart: s, charEnd: e });

    if (end >= src.length) break;

    // Advance with overlap — always move forward to guarantee termination
    const next = end - overlap;
    pos = next > pos ? next : end;
  }

  return chunks.map((c, index) => ({ index, ...c }));
}

/**
 * Chunk a document page-by-page aware: pages are joined into one text, chunked,
 * and every chunk is mapped back to the page(s) it came from — so citations
 * point at real pages rather than estimates.
 *
 * @param {string[]} pageTexts  one entry per page (1-based page = index + 1)
 * @returns {{ index, text, charStart, charEnd, pageNumber, pageEnd }[]}
 */
function chunkPages(pageTexts, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const SEP = '\n\n';
  const starts = [];      // char offset where each page begins in the joined text
  let joined = '';

  pageTexts.forEach((raw, i) => {
    const page = normalise(raw);
    if (i > 0) joined += SEP;
    starts.push(joined.length);
    joined += page;
  });

  const pageAt = (offset) => {
    // binary search: last page whose start <= offset
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid; else hi = mid - 1;
    }
    return lo + 1;
  };

  return chunkText(joined, chunkSize, overlap).map(c => ({
    ...c,
    pageNumber: pageAt(c.charStart),
    pageEnd:    pageAt(Math.max(c.charStart, c.charEnd - 1)),
  }));
}

module.exports = { chunkText, chunkPages, normalise };
