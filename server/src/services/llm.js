'use strict';

/**
 * llm.js
 *
 * Wraps the Groq SDK. Two model tiers:
 *   GROQ_MODEL       — answer synthesis + document briefs (quality)
 *   GROQ_FAST_MODEL  — helper steps: rewrite, plan, follow-ups, titles (latency)
 *
 * Exports:
 *   streamAnswer      — cited answer as an async iterable of token deltas
 *   rewriteQuery      — turn a follow-up into a standalone search query
 *   planQueries       — decompose a complex question into sub-queries
 *   suggestFollowUps  — propose next questions after an answer
 *   generateBrief     — structured "intelligence brief" for a document
 *   generateTitle     — short conversation title
 *   extractClaims     — split text into checkable claims (fact-check)
 *   judgeClaim        — verdict for one claim against passages (fact-check)
 *   generateQuiz      — cited multiple-choice questions (study mode)
 */

const Groq = require('groq-sdk');
const {
  GROQ_API_KEY, GROQ_MODEL, GROQ_FAST_MODEL, ANSWER_MAX_TOKENS, DEEP_ANSWER_MAX_TOKENS,
} = require('../config/env');

const groq = new Groq({ apiKey: GROQ_API_KEY });

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * If `err` is a provider rate-limit (429), return how long to wait in ms
 * (from the retry-after header, capped at 30s); otherwise null.
 */
function rateLimitDelay(err) {
  if (err?.status !== 429) return null;
  const header = Number(err.headers?.['retry-after'] ?? err.headers?.get?.('retry-after'));
  const ms = Number.isFinite(header) && header > 0 ? header * 1000 : 8000;
  return Math.min(ms, 30_000);
}

/** Single non-streaming completion → trimmed string. Waits out rate limits (up to 2 retries). */
async function complete({ model = GROQ_MODEL, messages, temperature = 0.2, max_tokens = 1024, json = false }) {
  for (let attempt = 0; ; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens,
        stream: false,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      });
      return (completion.choices[0]?.message?.content ?? '').trim();
    } catch (err) {
      const wait = rateLimitDelay(err);
      if (wait == null || attempt >= 2) throw err;
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

/** Completion that must return a JSON object. Falls back to `fallback` on any failure. */
async function completeJson(opts, fallback) {
  try {
    const raw = await complete({ ...opts, json: true });
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[llm] JSON completion failed:', err.message);
    return fallback;
  }
}

const cleanList = (arr, max) =>
  (Array.isArray(arr) ? arr : [])
    .map(s => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .slice(0, max);

const formatHistory = (history) =>
  history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 600)}`).join('\n');

// ── Answer synthesis ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Insight, a meticulous research analyst. You answer \
questions strictly from the numbered source passages you are given, which come \
from the user's own documents.

Rules:
- Use ONLY the provided sources. No outside knowledge, no guessing.
- Cite every factual claim inline with the source number in square brackets, \
e.g. "Revenue grew 12% [2]." Combine as [1][3] when several sources support a claim.
- Only cite source numbers that exist. Never invent page numbers, figures or quotes.
- If the sources do not contain the answer, say plainly that the documents do not \
cover it, and mention what related information they do contain (if any).
- When sources disagree, point out the disagreement and cite both sides.
- Use markdown where it helps: short paragraphs, bullet lists, **bold** key terms, \
tables for comparisons. Do not add a separate "Sources" section.`;

const MODE_GUIDANCE = {
  quick: 'Be direct and concise — lead with the answer in the first sentence.',
  deep:  'This is a deep-research request. Give a thorough, well-structured answer: ' +
         'start with a 1–2 sentence conclusion, then organise supporting detail under ' +
         'short headings (### …). Cover every sub-question in the research plan.',
};

/**
 * Build the numbered context block.
 * @param {{ text, pageNumber, pageEnd?, documentName }[]} sources
 */
function buildContext(sources) {
  return sources
    .map((s, i) => {
      const pages = s.pageEnd && s.pageEnd !== s.pageNumber
        ? `pages ${s.pageNumber}–${s.pageEnd}` : `page ${s.pageNumber}`;
      return `[${i + 1}] (${s.documentName}, ${pages})\n${s.text}`;
    })
    .join('\n\n---\n\n');
}

/**
 * Stream a cited answer.
 *
 * @param {object}   p
 * @param {string}   p.question     the user's original question
 * @param {object[]} p.sources      ordered sources; source i is cited as [i+1]
 * @param {object[]} p.history      prior turns [{ role, content }]
 * @param {'quick'|'deep'} p.mode
 * @param {string[]} [p.plan]       sub-questions (deep mode)
 * @returns {AsyncIterable<string>}
 */
async function* streamAnswer({ question, sources, history = [], mode = 'quick', plan = [] }) {
  const planBlock = plan.length
    ? `RESEARCH PLAN (address each):\n${plan.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\n`
    : '';

  const userTurn =
    `SOURCES:\n${buildContext(sources)}\n\n` +
    planBlock +
    `QUESTION: ${question}\n\n` +
    MODE_GUIDANCE[mode];

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userTurn },
  ];

  const stream = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature: 0.2,
    max_tokens:  mode === 'deep' ? DEEP_ANSWER_MAX_TOKENS : ANSWER_MAX_TOKENS,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

// ── Research helpers (fast model) ─────────────────────────────────────────────

/**
 * Rewrite a follow-up question into a standalone search query using history.
 * Returns the original question if there is no history or rewriting fails.
 */
async function rewriteQuery(question, history = []) {
  if (!history.length) return question;
  try {
    const out = await complete({
      model: GROQ_FAST_MODEL,
      temperature: 0,
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content:
            'Rewrite the user\'s latest question as a single standalone search query that ' +
            'can be understood without the conversation. Resolve pronouns and references ' +
            '("it", "that section", "the second one"). If it is already standalone, return ' +
            'it unchanged. Return only the query text.',
        },
        { role: 'user', content: `CONVERSATION:\n${formatHistory(history.slice(-6))}\n\nLATEST QUESTION: ${question}` },
      ],
    });
    return out.replace(/^["']|["']$/g, '').trim() || question;
  } catch {
    return question;
  }
}

/**
 * Decompose a question into focused retrieval sub-queries (deep mode).
 * @returns {Promise<string[]>}  1–4 sub-queries
 */
async function planQueries(question, documentNames = []) {
  const res = await completeJson({
    model: GROQ_FAST_MODEL,
    temperature: 0.2,
    max_tokens: 400,
    messages: [
      {
        role: 'system',
        content:
          'You plan document research. Break the question into 2–4 short, specific search ' +
          'queries that together cover everything needed to answer it (definitions, figures, ' +
          'comparisons, causes, exceptions). If several documents are in scope and the ' +
          'question compares them, include one query per document aspect. ' +
          'Respond as JSON: {"queries": ["...", "..."]}',
      },
      {
        role: 'user',
        content: `DOCUMENTS IN SCOPE: ${documentNames.join(', ') || 'one document'}\nQUESTION: ${question}`,
      },
    ],
  }, { queries: [] });

  const queries = cleanList(res.queries, 4);
  return queries.length ? queries : [question];
}

/**
 * Suggest follow-up questions that the documents can likely answer.
 * @returns {Promise<string[]>}
 */
async function suggestFollowUps(question, answer, sources) {
  const context = sources.slice(0, 6).map(s => s.text.slice(0, 300)).join('\n---\n');
  const res = await completeJson({
    model: GROQ_FAST_MODEL,
    temperature: 0.5,
    max_tokens: 250,
    messages: [
      {
        role: 'system',
        content:
          'Suggest 3 natural follow-up questions a curious reader would ask next. Each must be ' +
          'answerable from the document excerpts, under 12 words, and not repeat the question. ' +
          'Respond as JSON: {"questions": ["...", "...", "..."]}',
      },
      {
        role: 'user',
        content: `QUESTION: ${question}\n\nANSWER: ${answer.slice(0, 1500)}\n\nEXCERPTS:\n${context}`,
      },
    ],
  }, { questions: [] });
  return cleanList(res.questions, 3);
}

// ── Document brief ────────────────────────────────────────────────────────────

/**
 * Generate a structured brief from a representative sample of a document.
 *
 * @param {string} name     document name
 * @param {string} sample   representative text (page-tagged), ≤ ~14k chars
 * @returns {Promise<object>}
 */
async function generateBrief(name, sample) {
  const raw = await complete({
    model: GROQ_MODEL,
    json: true,
    temperature: 0.2,
    max_tokens: 1200,
    messages: [
      {
        role: 'system',
        content:
          'You are an analyst preparing an executive brief of a document. Use only the text ' +
          'provided. Respond with JSON of exactly this shape:\n' +
          '{\n' +
          '  "documentType": "short label, e.g. Research paper, Financial report, Contract, Resume",\n' +
          '  "summary": "3–4 sentence plain-language overview",\n' +
          '  "keyPoints": ["4–6 most important takeaways, one sentence each"],\n' +
          '  "topics": ["3–8 short topic tags"],\n' +
          '  "entities": [{"name": "...", "type": "person|organization|place|product|law|other"}],\n' +
          '  "keyFigures": [{"label": "what the number measures", "value": "the number with unit", "page": 1}],\n' +
          '  "suggestedQuestions": ["5 specific questions this document can answer"]\n' +
          '}\n' +
          'Limit entities to the 10 most important and keyFigures to the 6 most important ' +
          '(empty array if none). The [Page N] markers tell you where text comes from.',
      },
      { role: 'user', content: `DOCUMENT: ${name}\n\n${sample}` },
    ],
  });

  const data = JSON.parse(raw);
  return {
    documentType:       String(data.documentType ?? '').slice(0, 60),
    summary:            String(data.summary ?? ''),
    keyPoints:          cleanList(data.keyPoints, 6),
    topics:             cleanList(data.topics, 8),
    entities:           (Array.isArray(data.entities) ? data.entities : [])
                          .filter(e => e?.name)
                          .slice(0, 10)
                          .map(e => ({ name: String(e.name), type: String(e.type ?? 'other') })),
    keyFigures:         (Array.isArray(data.keyFigures) ? data.keyFigures : [])
                          .filter(f => f?.label && f?.value)
                          .slice(0, 6)
                          .map(f => ({
                            label: String(f.label),
                            value: String(f.value),
                            page:  Number.isFinite(+f.page) ? +f.page : undefined,
                          })),
    suggestedQuestions: cleanList(data.suggestedQuestions, 5),
    generatedAt:        new Date(),
  };
}

// ── Fact-checking ─────────────────────────────────────────────────────────────

/**
 * Split free text into atomic, checkable factual claims.
 * @returns {Promise<string[]>}  1–8 claims
 */
async function extractClaims(text) {
  const res = await completeJson({
    model: GROQ_FAST_MODEL,
    temperature: 0,
    max_tokens: 600,
    messages: [
      {
        role: 'system',
        content:
          'Extract the factual claims from the text so each can be checked against source ' +
          'documents. Each claim must be atomic (one fact), self-contained (no pronouns that ' +
          'need context) and checkable. Skip opinions, questions and greetings. Keep numbers, ' +
          'names and dates exactly as written. At most 8 claims, in order of appearance. ' +
          'Respond as JSON: {"claims": ["...", "..."]}',
      },
      { role: 'user', content: text.slice(0, 6000) },
    ],
  }, { claims: [] });
  return cleanList(res.claims, 8);
}

const VERDICTS = ['supported', 'partially_supported', 'contradicted', 'not_found'];

/**
 * Judge one claim against numbered passages.
 * @returns {Promise<{ verdict, confidence, explanation, correction }>}
 */
async function judgeClaim(claim, sources) {
  const res = await completeJson({
    model: GROQ_MODEL,
    temperature: 0,
    max_tokens: 350,
    messages: [
      {
        role: 'system',
        content:
          'You are a rigorous fact-checker. Judge the CLAIM using ONLY the numbered PASSAGES.\n' +
          'verdict:\n' +
          '- "supported": the passages clearly state it\n' +
          '- "partially_supported": some parts match, others differ or are missing\n' +
          '- "contradicted": the passages state something incompatible (e.g. a different number)\n' +
          '- "not_found": the passages do not address it\n' +
          'Cite passages inline as [n] in the explanation and correction. ' +
          'Respond as JSON: {"verdict": "...", "confidence": 0.0-1.0, ' +
          '"explanation": "1–2 sentences with [n] citations", ' +
          '"correction": "what the documents actually say (only if partially_supported or contradicted, else empty)"}',
      },
      { role: 'user', content: `CLAIM: ${claim}\n\nPASSAGES:\n${buildContext(sources)}` },
    ],
  }, null);

  if (!res || !VERDICTS.includes(res.verdict)) {
    return { verdict: 'not_found', confidence: 0, explanation: 'The claim could not be assessed.', correction: '' };
  }
  return {
    verdict:     res.verdict,
    confidence:  Math.min(1, Math.max(0, Number(res.confidence) || 0)),
    explanation: String(res.explanation ?? ''),
    correction:  ['partially_supported', 'contradicted'].includes(res.verdict) ? String(res.correction ?? '') : '',
  };
}

// ── Study quizzes ─────────────────────────────────────────────────────────────

/**
 * Generate multiple-choice questions from page-tagged document text.
 * Options are shuffled here so the right answer isn't always first.
 *
 * @param {string} name
 * @param {string} sample      page-tagged text ([Page N] markers)
 * @param {object} opts        { count, difficulty, focus }
 * @returns {Promise<{ question, options:string[], answerIndex, explanation, page }[]>}
 */
async function generateQuiz(name, sample, { count = 5, difficulty = 'medium', focus = '' } = {}) {
  const level = {
    easy:   'recall of explicitly stated facts and definitions',
    medium: 'understanding — relationships, causes, and why things matter',
    hard:   'application and analysis — comparisons, implications, edge cases; distractors must be plausible',
  }[difficulty] ?? 'understanding';

  const raw = await complete({
    model: GROQ_MODEL,
    json: true,
    temperature: 0.6,
    max_tokens: 250 * count,
    messages: [
      {
        role: 'system',
        content:
          `Write ${count} multiple-choice questions that test ${level}, using ONLY the text provided` +
          `${focus ? `, focused on "${focus}"` : ''}. Each has exactly 4 options and one correct answer. ` +
          'Cover different parts of the text; no trick wording; no "all of the above". The explanation ' +
          'says why the answer is right in one or two sentences. "page" is the [Page N] the answer comes from.\n' +
          'Respond as JSON: {"questions": [{"question": "...", "options": ["...","...","...","..."], ' +
          '"answerIndex": 0, "explanation": "...", "page": 1}]}',
      },
      { role: 'user', content: `DOCUMENT: ${name}\n\n${sample}` },
    ],
  });

  const data = JSON.parse(raw);
  return (Array.isArray(data.questions) ? data.questions : [])
    .filter(q => q?.question && Array.isArray(q.options) && q.options.length === 4 &&
                 Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < 4)
    .slice(0, count)
    .map(q => {
      const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      return {
        question:    String(q.question),
        options:     order.map(i => String(q.options[i])),
        answerIndex: order.indexOf(q.answerIndex),
        explanation: String(q.explanation ?? ''),
        page:        Number.isFinite(+q.page) ? +q.page : null,
      };
    });
}

// ── Title ─────────────────────────────────────────────────────────────────────

/**
 * Auto-generate a short, descriptive conversation title (≤ 8 words)
 * from the user's first message.
 */
async function generateTitle(firstMessage) {
  try {
    const title = await complete({
      model: GROQ_FAST_MODEL,
      temperature: 0.3,
      max_tokens: 40,
      messages: [
        {
          role: 'system',
          content:
            'Generate a concise conversation title (max 8 words, no punctuation at the end) ' +
            'that captures the topic of this question. Return only the title, nothing else.',
        },
        { role: 'user', content: firstMessage },
      ],
    });
    return title.replace(/["']/g, '') || firstMessage.slice(0, 60).trim();
  } catch {
    return firstMessage.slice(0, 60).trim();
  }
}

module.exports = {
  rateLimitDelay,
  streamAnswer,
  rewriteQuery,
  planQueries,
  suggestFollowUps,
  generateBrief,
  generateTitle,
  extractClaims,
  judgeClaim,
  generateQuiz,
};
