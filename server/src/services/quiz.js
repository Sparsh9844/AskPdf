'use strict';

/**
 * quiz.js — study-mode question generation.
 *
 * Without a focus, a random spread of pages is sampled so every quiz is
 * different. With a focus topic, the passages most relevant to that topic are
 * retrieved instead, so the quiz drills into exactly what the user wants.
 */

const { parseDocument }   = require('../utils/documentParser');
const { normalise }       = require('../utils/chunker');
const { generateQuiz }    = require('./llm');
const { retrieve }        = require('./researchEngine');

const SAMPLE_CHARS = 9000;

/** Random, page-tagged sample: a handful of random pages in reading order. */
function randomSample(pageTexts) {
  const pages = pageTexts
    .map((t, i) => ({ n: i + 1, text: normalise(t) }))
    .filter(p => p.text.length > 80);
  if (pages.length === 0) return '';

  const shuffled = [...pages].sort(() => Math.random() - 0.5);
  const per = Math.max(1200, Math.floor(SAMPLE_CHARS / Math.min(pages.length, 6)));
  const chosen = [];
  let used = 0;
  for (const p of shuffled) {
    if (used >= SAMPLE_CHARS) break;
    // random window inside long pages
    const start = p.text.length > per ? Math.floor(Math.random() * (p.text.length - per)) : 0;
    const text = p.text.slice(start, start + per);
    chosen.push({ n: p.n, text });
    used += text.length;
  }
  return chosen
    .sort((a, b) => a.n - b.n)
    .map(p => `[Page ${p.n}]\n${p.text}`)
    .join('\n\n');
}

/**
 * @param {import('mongoose').Document} doc   completed Document
 * @param {{ count?:number, difficulty?:string, focus?:string }} opts
 */
async function buildQuiz(doc, { count = 5, difficulty = 'medium', focus = '' } = {}) {
  let sample;

  if (focus) {
    const hits = await retrieve([focus], [doc._id.toString()], { candidatesPerQuery: 12, finalSources: 8 });
    sample = hits
      .sort((a, b) => a.chunkIndex - b.chunkIndex)
      .map(h => `[Page ${h.pageNumber}]\n${h.text}`)
      .join('\n\n');
  }
  if (!sample) {
    const { pageTexts } = await parseDocument(doc.filePath);
    sample = randomSample(pageTexts);
  }
  if (!sample) throw new Error('The document has no text to build questions from.');

  const questions = await generateQuiz(doc.name, sample, { count, difficulty, focus });
  if (questions.length === 0) throw new Error('Could not generate questions — please try again.');
  return questions;
}

module.exports = { buildQuiz, randomSample };
