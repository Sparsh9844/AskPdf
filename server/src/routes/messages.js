'use strict';

/**
 * Message routes (nested under /api/conversations/:conversationId/messages)
 *
 * GET  /api/conversations/:conversationId/messages        Get message history
 * POST /api/conversations/:conversationId/messages        Send a message → AI answer
 * POST /api/conversations/:conversationId/messages/stream Same but streaming SSE
 *
 * Both POST variants accept { content, mode } where mode is 'quick' | 'deep'
 * and run through the research engine (see services/researchEngine.js).
 *
 * Streaming sends `done` as soon as the answer is saved, then a separate
 * `followups` event — suggestions never hold up the answer.
 */

const router       = require('express').Router({ mergeParams: true });
const Conversation = require('../models/Conversation');
const Document     = require('../models/Document');
const Message      = require('../models/Message');
const { research, suggestFollowUps } = require('../services/researchEngine');
const { generateTitle } = require('../services/llm');
const ApiError = require('../utils/apiError');

// ── Shared: load conversation + documents in scope, validate ready ───────────
async function loadConv(conversationId, userId) {
  const conv = await Conversation.findOne({ _id: conversationId, owner: userId });
  if (!conv) throw ApiError.notFound('Conversation not found.');

  const ids  = conv.documentIds?.length ? conv.documentIds : [conv.documentId];
  const docs = await Document.find({ _id: { $in: ids }, owner: userId });
  if (docs.length === 0) throw ApiError.notFound('The documents for this conversation no longer exist.');

  const ready = docs.filter(d => d.status === 'completed');
  if (ready.length === 0)
    throw ApiError.conflict('Documents are still processing. Please wait.');

  return { conv, docs: ready };
}

function parseBody(body) {
  const { content, mode } = body ?? {};
  if (!content?.trim()) throw ApiError.badRequest('content is required.');
  if (content.length > 4000) throw ApiError.badRequest('content is too long (max 4000 characters).');
  return { question: content.trim(), mode: mode === 'deep' ? 'deep' : 'quick' };
}

/**
 * Persist the user turn, run research, persist the answer, update the conversation.
 * `onEvent` receives every engine event (for streaming).
 * @returns {Promise<{ aiMsg, result }>}
 */
async function answer(conv, docs, question, mode, onEvent = () => {}) {
  const t0 = Date.now();

  // The title depends only on the question — generate it while researching
  const titlePromise = conv.messageCount === 0 ? generateTitle(question) : null;

  // History is read BEFORE saving the new question so it isn't sent twice
  const history = (await Message.find({ conversationId: conv._id })
    .sort({ createdAt: -1 })
    .limit(6)
    .select('role content')
    .lean()).reverse();

  await Message.create({ owner: conv.owner, conversationId: conv._id, role: 'user', content: question });

  let result = null;
  for await (const event of research({
    question,
    history,
    documents: docs.map(d => ({ id: d._id.toString(), name: d.name })),
    mode,
  })) {
    if (event.type === 'result') result = event.data;
    else onEvent(event);
  }

  const aiMsg = await Message.create({
    owner:          conv.owner,
    conversationId: conv._id,
    role:      'assistant',
    content:   result.content,
    sources:   result.sources,
    latencyMs: Date.now() - t0,
    mode,
    trace:     result.trace,
    grounding: result.grounding,
  });

  const updatePayload = {
    lastMessage:  question.slice(0, 200),
    messageCount: conv.messageCount + 2,
  };
  if (titlePromise) updatePayload.title = await titlePromise;
  await Conversation.findByIdAndUpdate(conv._id, updatePayload);

  return { aiMsg, result };
}

/** Generate follow-up suggestions for a saved answer and store them on it. */
async function attachFollowUps(aiMsg, question, result) {
  const followUps = await suggestFollowUps(question, result);
  if (followUps.length) await Message.updateOne({ _id: aiMsg._id }, { followUps });
  return followUps;
}

// ── GET /api/conversations/:conversationId/messages ───────────────────────────
router.get('/', async (req, res) => {
  const conv = await Conversation.findOne({ _id: req.params.conversationId, owner: req.userId });
  if (!conv) throw ApiError.notFound('Conversation not found.');

  const messages = await Message.find({ conversationId: conv._id }).sort({ createdAt: 1 });
  res.json(messages);
});

// ── POST /api/conversations/:conversationId/messages ─────────────────────────
router.post('/', async (req, res) => {
  const { question, mode } = parseBody(req.body);
  const { conv, docs } = await loadConv(req.params.conversationId, req.userId);

  const { aiMsg, result } = await answer(conv, docs, question, mode);
  aiMsg.followUps = await attachFollowUps(aiMsg, question, result);
  res.status(201).json(aiMsg);
});

// ── POST /api/conversations/:conversationId/messages/stream  (SSE) ────────────
router.post('/stream', async (req, res) => {
  const { question, mode } = parseBody(req.body);
  const { conv, docs } = await loadConv(req.params.conversationId, req.userId);

  res.writeHead(200, {
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const send = (event, data) => {
    if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { aiMsg, result } = await answer(conv, docs, question, mode, (e) => send(e.type, e.data));
    send('done', aiMsg);
    const followUps = await attachFollowUps(aiMsg, question, result);
    send('followups', { messageId: aiMsg.id, followUps });
  } catch (err) {
    console.error('[messages/stream]', err);
    send('error', { message: err.message });
  } finally {
    res.end();
  }
});

module.exports = router;
