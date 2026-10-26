'use strict';

/**
 * factChecker.js
 *
 * Verify arbitrary text against the user's documents:
 *   1. extract atomic claims from the text
 *   2. for each claim, retrieve the most relevant passages (hybrid retrieval)
 *   3. judge the claim: supported / partially_supported / contradicted / not_found,
 *      with a cited explanation and, where needed, a correction
 *
 * Results stream claim-by-claim so the UI fills in as verdicts arrive.
 */

const llm = require('./llm');
const { retrieve, citedNumbers } = require('./researchEngine');

const SNIPPET_CHARS = 1200;
const CONCURRENCY   = 3;     // claims checked at once (keeps within provider rate limits)

/**
 * @param {object} p
 * @param {string} p.text
 * @param {{ id:string, name:string }[]} p.documents
 *
 * Yields:
 *   { type: 'claims',  data: string[] }
 *   { type: 'verdict', data: ClaimResult }
 *   { type: 'result',  data: { claims: ClaimResult[], summary } }
 */
async function* factCheck({ text, documents }) {
  const docIds = documents.map(d => d.id);
  const nameOf = Object.fromEntries(documents.map(d => [d.id, d.name]));

  const claims = await llm.extractClaims(text);
  yield { type: 'claims', data: claims };

  // Claims are checked a few at a time; verdicts are still yielded in order
  const inflight = [];
  let launched = 0;
  const launch = () => {
    if (launched >= claims.length) return;
    const i = launched++;
    inflight[i] = checkClaim(claims[i], i, docIds, nameOf);
    inflight[i].catch(() => {});   // surfaced when awaited below
  };
  for (let k = 0; k < CONCURRENCY; k++) launch();

  const results = [];
  for (let i = 0; i < claims.length; i++) {
    const result = await inflight[i];
    launch();
    results.push(result);
    yield { type: 'verdict', data: result };
  }

  const count = (v) => results.filter(r => r.verdict === v).length;
  const summary = {
    total:              results.length,
    supported:          count('supported'),
    partiallySupported: count('partially_supported'),
    contradicted:       count('contradicted'),
    notFound:           count('not_found'),
  };
  // Accuracy among claims the documents actually address
  const addressed = summary.total - summary.notFound;
  summary.accuracy = addressed
    ? Math.round(((summary.supported + 0.5 * summary.partiallySupported) / addressed) * 100)
    : null;

  yield { type: 'result', data: { claims: results, summary } };
}

/** Retrieve passages for one claim and judge it. */
async function checkClaim(claim, i, docIds, nameOf) {
  const hits = await retrieve([claim], docIds, { candidatesPerQuery: 8, finalSources: 4 });
  const sources = hits.map((h, j) => ({
    index:        j + 1,
    documentId:   h.documentId,
    documentName: nameOf[h.documentId] ?? 'Document',
    pageNumber:   h.pageNumber,
    pageEnd:      h.pageEnd,
    chunkIndex:   h.chunkIndex,
    text:         h.text,
    score:        Math.min(1, Math.max(0, Math.round(h.cosine * 1000) / 1000)),
  }));

  const verdict = sources.length
    ? await llm.judgeClaim(claim, sources)
    : { verdict: 'not_found', confidence: 0, explanation: 'No related passages were found.', correction: '' };

  const cited = citedNumbers(`${verdict.explanation} ${verdict.correction}`, sources.length);
  return {
    index: i + 1,
    claim,
    ...verdict,
    sources: sources.map(({ text: t, ...s }) => ({
      ...s,
      snippet: t.slice(0, SNIPPET_CHARS),
      cited:   cited.has(s.index),
    })),
  };
}

module.exports = { factCheck };
