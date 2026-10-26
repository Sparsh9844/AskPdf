'use strict';

/**
 * Conversation routes
 *
 * GET    /api/conversations              List (optionally filter by ?documentId=)
 * POST   /api/conversations              Create — { documentIds: [...] } or { documentId }
 * GET    /api/conversations/:id          Get single conversation
 * DELETE /api/conversations/:id          Delete conversation + messages
 * PATCH  /api/conversations/:id          Update { title } and/or { documentIds }
 * GET    /api/conversations/:id/export   Download as a cited Markdown report
 */

const router       = require('express').Router();
const Conversation = require('../models/Conversation');
const Message      = require('../models/Message');
const Document     = require('../models/Document');
const ApiError     = require('../utils/apiError');
const { buildReport, fileName } = require('../utils/markdownReport');

const MAX_SCOPE = 10;

/** Validate a requested document scope and return the ready Document records in order. */
async function resolveScope(rawIds, userId) {
  const ids = [...new Set((Array.isArray(rawIds) ? rawIds : [rawIds]).filter(Boolean).map(String))];
  if (ids.length === 0) throw ApiError.badRequest('At least one document is required.');
  if (ids.length > MAX_SCOPE) throw ApiError.badRequest(`A conversation can include at most ${MAX_SCOPE} documents.`);

  const docs = await Document.find({ _id: { $in: ids }, owner: userId });
  if (docs.length !== ids.length) throw ApiError.notFound('One or more documents were not found.');

  const notReady = docs.filter(d => d.status !== 'completed');
  if (notReady.length)
    throw ApiError.conflict(`Still processing: ${notReady.map(d => d.name).join(', ')}`);

  const byId = new Map(docs.map(d => [d._id.toString(), d]));
  return ids.map(id => byId.get(id));
}

const scopeFields = (docs) => ({
  documentId:    docs[0]._id,
  documentName:  docs[0].name,
  documentIds:   docs.map(d => d._id),
  documentNames: docs.map(d => d.name),
});

// ── GET /api/conversations ────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const filter = { owner: req.userId };
  if (req.query.documentId) {
    filter.$or = [{ documentId: req.query.documentId }, { documentIds: req.query.documentId }];
  }

  const convs = await Conversation.find(filter).sort({ updatedAt: -1 });
  res.json(convs);
});

// ── POST /api/conversations ───────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { documentIds, documentId, title } = req.body ?? {};
  const docs = await resolveScope(documentIds ?? documentId, req.userId);

  const conv = await Conversation.create({
    owner: req.userId,
    ...scopeFields(docs),
    title: title?.trim() || 'New Conversation',
  });

  await Document.updateMany({ _id: { $in: docs.map(d => d._id) } }, { $inc: { conversations: 1 } });

  res.status(201).json(conv);
});

// ── GET /api/conversations/:id ────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const conv = await Conversation.findOne({ _id: req.params.id, owner: req.userId });
  if (!conv) throw ApiError.notFound('Conversation not found.');
  res.json(conv);
});

// ── GET /api/conversations/:id/export ─────────────────────────────────────────
router.get('/:id/export', async (req, res) => {
  const conv = await Conversation.findOne({ _id: req.params.id, owner: req.userId });
  if (!conv) throw ApiError.notFound('Conversation not found.');

  const messages = await Message.find({ conversationId: conv._id }).sort({ createdAt: 1 });

  // Pair each question with the answer that follows it
  const sections = [];
  messages.forEach((m, i) => {
    if (m.role !== 'assistant') return;
    const q = messages[i - 1]?.role === 'user' ? messages[i - 1].content : '';
    sections.push({ heading: q || `Answer ${sections.length + 1}`, content: m.content, sources: m.sources });
  });
  if (sections.length === 0) throw ApiError.badRequest('This conversation has no answers yet.');

  const names = conv.documentNames?.length ? conv.documentNames : [conv.documentName];
  const md = buildReport({ title: conv.title, subtitle: `Sources: ${names.join(', ')}`, sections });

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName(conv.title)}"`);
  res.send(md);
});

// ── PATCH /api/conversations/:id ──────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const { title, documentIds } = req.body ?? {};
  if (title === undefined && documentIds === undefined)
    throw ApiError.badRequest('Nothing to update — send title and/or documentIds.');

  const conv = await Conversation.findOne({ _id: req.params.id, owner: req.userId });
  if (!conv) throw ApiError.notFound('Conversation not found.');

  const update = {};
  if (title !== undefined) {
    if (!String(title).trim()) throw ApiError.badRequest('title cannot be empty.');
    update.title = String(title).trim();
  }

  if (documentIds !== undefined) {
    const docs   = await resolveScope(documentIds, req.userId);
    const before = new Set((conv.documentIds?.length ? conv.documentIds : [conv.documentId]).map(String));
    const after  = new Set(docs.map(d => d._id.toString()));
    const added   = [...after].filter(id => !before.has(id));
    const removed = [...before].filter(id => !after.has(id));

    Object.assign(update, scopeFields(docs));
    if (added.length)   await Document.updateMany({ _id: { $in: added } },   { $inc: { conversations: 1 } });
    if (removed.length) await Document.updateMany({ _id: { $in: removed } }, { $inc: { conversations: -1 } });
  }

  const updated = await Conversation.findByIdAndUpdate(conv._id, update, { new: true });
  res.json(updated);
});

// ── DELETE /api/conversations/:id ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const conv = await Conversation.findOne({ _id: req.params.id, owner: req.userId });
  if (!conv) throw ApiError.notFound('Conversation not found.');

  const scope = conv.documentIds?.length ? conv.documentIds : [conv.documentId];

  await Message.deleteMany({ conversationId: conv._id });
  await Document.updateMany({ _id: { $in: scope } }, { $inc: { conversations: -1 } });
  await conv.deleteOne();

  res.status(204).end();
});

module.exports = router;
