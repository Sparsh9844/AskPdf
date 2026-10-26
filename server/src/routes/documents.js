'use strict';

/**
 * Document routes
 *
 * POST   /api/documents/upload      Upload a PDF and kick off pipeline
 * GET    /api/documents             List all documents
 * GET    /api/documents/:id         Get a single document
 * DELETE /api/documents/:id         Delete document + vectors
 * POST   /api/documents/:id/reprocess   Re-run the pipeline
 * POST   /api/documents/:id/brief   (Re)generate the intelligence brief
 * POST   /api/documents/:id/quiz    Generate a study quiz { count, difficulty, focus }
 * GET    /api/documents/:id/stream  SSE progress stream
 */

const router = require('express').Router();

const Document     = require('../models/Document');
const Conversation = require('../models/Conversation');
const Message      = require('../models/Message');
const { upload, deleteFile } = require('../services/storage');
const { runPipeline, analyzeDocument } = require('../services/pipeline');
const { parseDocument }      = require('../utils/documentParser');
const { buildQuiz }          = require('../services/quiz');
const { deleteDocument }     = require('../services/vectorStore');
const sseManager             = require('../services/sseManager');
const ApiError               = require('../utils/apiError');

// ── POST /api/documents/upload ────────────────────────────────────────────────
router.post(
  '/upload',
  upload.single('file'),
  async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No file uploaded.');

    const doc = await Document.create({
      owner:        req.userId,
      name:         req.file.originalname,
      originalName: req.file.originalname,
      filePath:     req.file.path,
      mimeType:     req.file.mimetype,
      size:         req.file.size,
      status:       'uploading',
    });

    // Fire-and-forget pipeline (client polls via SSE)
    setImmediate(() =>
      runPipeline(doc._id.toString(), req.file.path, sseManager)
    );

    res.status(201).json(doc);
  }
);

// ── GET /api/documents ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const filter = { owner: req.userId };
  if (req.query.status) filter.status = req.query.status;

  const docs = await Document.find(filter).sort({ createdAt: -1 });
  res.json(docs);
});

// ── GET /api/documents/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, owner: req.userId });
  if (!doc) throw ApiError.notFound('Document not found.');
  res.json(doc);
});

// ── DELETE /api/documents/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, owner: req.userId });
  if (!doc) throw ApiError.notFound('Document not found.');

  const docId = doc._id.toString();
  await deleteDocument(docId);

  // Conversations scoped only to this document are removed; multi-document
  // conversations simply drop it from their scope.
  const convs = await Conversation.find({ $or: [{ documentId: doc._id }, { documentIds: doc._id }] });
  for (const conv of convs) {
    const scope     = (conv.documentIds?.length ? conv.documentIds : [conv.documentId]).map(String);
    const remaining = scope.filter(id => id !== docId);

    const others = remaining.length
      ? await Document.find({ _id: { $in: remaining } }).select('name')
      : [];
    const nameOf = new Map(others.map(d => [d._id.toString(), d.name]));
    const kept   = remaining.filter(id => nameOf.has(id));
    if (kept.length === 0) {
      await Message.deleteMany({ conversationId: conv._id });
      await conv.deleteOne();
      continue;
    }
    await conv.updateOne({
      documentId:    kept[0],
      documentName:  nameOf.get(kept[0]),
      documentIds:   kept,
      documentNames: kept.map(id => nameOf.get(id)),
    });
  }

  // Remove file from disk
  deleteFile(doc.filePath);

  await doc.deleteOne();
  res.status(204).end();
});

// ── POST /api/documents/:id/reprocess ────────────────────────────────────────
router.post('/:id/reprocess', async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, owner: req.userId });
  if (!doc) throw ApiError.notFound('Document not found.');

  await deleteDocument(doc._id.toString());

  await doc.updateOne({
    status:     'uploading',
    chunks:     0,
    embeddings: 0,
    pages:      0,
    wordCount:  0,
    brief:      null,
    briefError: null,
    errorMessage: null,
  });

  const fresh = await Document.findById(doc._id);

  setImmediate(() =>
    runPipeline(doc._id.toString(), doc.filePath, sseManager)
  );

  res.json(fresh);
});

// ── POST /api/documents/:id/brief ────────────────────────────────────────────
// Useful for documents indexed before briefs existed, or to refresh one.
router.post('/:id/brief', async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, owner: req.userId });
  if (!doc) throw ApiError.notFound('Document not found.');
  if (doc.status !== 'completed')
    throw ApiError.conflict('Document must be fully processed first.');

  const { text, pageTexts } = await parseDocument(doc.filePath);
  const brief = await analyzeDocument(doc._id.toString(), doc.name, pageTexts);
  if (!brief) throw ApiError.internal('Brief generation failed. Please try again.');

  const update = { brief };
  if (!doc.wordCount) update.wordCount = (text.match(/\S+/g) ?? []).length;
  const fresh = await Document.findByIdAndUpdate(doc._id, update, { new: true });
  res.json(fresh);
});

// ── POST /api/documents/:id/quiz ─────────────────────────────────────────────
router.post('/:id/quiz', async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, owner: req.userId });
  if (!doc) throw ApiError.notFound('Document not found.');
  if (doc.status !== 'completed')
    throw ApiError.conflict('Document must be fully processed first.');

  const { count, difficulty, focus } = req.body ?? {};
  const questions = await buildQuiz(doc, {
    count:      Math.min(10, Math.max(3, parseInt(count, 10) || 5)),
    difficulty: ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium',
    focus:      String(focus ?? '').trim().slice(0, 200),
  });

  res.json({ documentId: doc.id, documentName: doc.name, questions });
});

// ── GET /api/documents/:id/stream  (SSE) ─────────────────────────────────────
router.get('/:id/stream', async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, owner: req.userId });
  if (!doc) throw ApiError.notFound('Document not found.');

  // If already completed/errored, immediately send final event and close
  if (doc.status === 'completed') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    res.write(`event: done\ndata: ${JSON.stringify({ docId: req.params.id, pct: 100 })}\n\n`);
    res.end();
    return;
  }
  if (doc.status === 'error') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    res.write(`event: error\ndata: ${JSON.stringify({ message: doc.errorMessage })}\n\n`);
    res.end();
    return;
  }

  const cleanup = sseManager.addClient(req.params.id, res);
  req.on('close', cleanup);

  // The pipeline may have finished between the lookup above and registering
  // the client — re-check so the client isn't left waiting forever
  const latest = await Document.findById(doc._id).select('status errorMessage').lean();
  if (latest?.status === 'completed') {
    sseManager.emit(req.params.id, 'done', { docId: req.params.id, pct: 100 });
  } else if (latest?.status === 'error') {
    sseManager.emit(req.params.id, 'error', { message: latest.errorMessage });
  }
});

module.exports = router;
