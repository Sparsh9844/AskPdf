'use strict';

/**
 * Notebook routes
 *
 * GET    /api/notes             List notes (newest first)
 * POST   /api/notes             Save a note { kind, title, question, content, sources, … }
 * PATCH  /api/notes/:id         Update { title } and/or { content }
 * DELETE /api/notes/:id         Delete a note
 * GET    /api/notes/export      Download all (or ?ids=a,b) notes as a cited Markdown report
 */

const router   = require('express').Router();
const Note     = require('../models/Note');
const ApiError = require('../utils/apiError');
const { buildReport, fileName } = require('../utils/markdownReport');

const pick = (body, keys) =>
  Object.fromEntries(keys.filter(k => body[k] !== undefined).map(k => [k, body[k]]));

// ── GET /api/notes ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const notes = await Note.find({ owner: req.userId }).sort({ createdAt: -1 });
  res.json(notes);
});

// ── GET /api/notes/export ─────────────────────────────────────────────────────
router.get('/export', async (req, res) => {
  const filter = { owner: req.userId };
  if (req.query.ids) filter._id = { $in: String(req.query.ids).split(',').filter(Boolean) };

  const notes = await Note.find(filter).sort({ createdAt: 1 });
  if (notes.length === 0) throw ApiError.notFound('No notes to export.');

  const docs = [...new Set(notes.flatMap(n => n.documentNames))];
  const md = buildReport({
    title:    'Research Notebook',
    subtitle: `${notes.length} finding${notes.length > 1 ? 's' : ''} · Sources: ${docs.join(', ') || '—'}`,
    sections: notes.map(n => ({
      heading:  n.title,
      question: n.question,
      content:  n.content,
      sources:  n.sources,
    })),
  });

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName('insight-notebook')}"`);
  res.send(md);
});

// ── POST /api/notes ───────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const body = req.body ?? {};
  if (!body.title?.trim()) throw ApiError.badRequest('title is required.');

  const note = await Note.create({
    ...pick(body, ['kind', 'title', 'question', 'content', 'sources', 'documentNames', 'documentIds', 'conversationId']),
    owner: req.userId,
  });
  res.status(201).json(note);
});

// ── PATCH /api/notes/:id ──────────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const update = pick(req.body ?? {}, ['title', 'content']);
  if (Object.keys(update).length === 0) throw ApiError.badRequest('Nothing to update.');
  if (update.title !== undefined && !String(update.title).trim())
    throw ApiError.badRequest('title cannot be empty.');

  const note = await Note.findOneAndUpdate({ _id: req.params.id, owner: req.userId }, update, { new: true, runValidators: true });
  if (!note) throw ApiError.notFound('Note not found.');
  res.json(note);
});

// ── DELETE /api/notes/:id ─────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: req.params.id, owner: req.userId });
  if (!note) throw ApiError.notFound('Note not found.');
  res.status(204).end();
});

module.exports = router;
