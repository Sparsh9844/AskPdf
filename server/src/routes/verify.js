'use strict';

/**
 * Fact-check route
 *
 * POST /api/verify/stream   { documentIds: [...], text }  →  SSE
 *   events: claims (list), verdict (one per claim), done (claims + summary), error
 */

const router    = require('express').Router();
const Document  = require('../models/Document');
const ApiError  = require('../utils/apiError');
const { factCheck } = require('../services/factChecker');

const MAX_TEXT = 6000;

router.post('/stream', async (req, res) => {
  const { documentIds, text } = req.body ?? {};
  if (!text?.trim()) throw ApiError.badRequest('text is required.');
  if (text.length > MAX_TEXT) throw ApiError.badRequest(`text is too long (max ${MAX_TEXT} characters).`);

  const ids = [...new Set((Array.isArray(documentIds) ? documentIds : []).map(String))];
  if (ids.length === 0) throw ApiError.badRequest('Select at least one document to check against.');
  if (ids.length > 10) throw ApiError.badRequest('At most 10 documents.');

  const docs = await Document.find({ _id: { $in: ids }, owner: req.userId, status: 'completed' });
  if (docs.length === 0) throw ApiError.notFound('No processed documents found.');

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
    for await (const event of factCheck({
      text: text.trim(),
      documents: docs.map(d => ({ id: d._id.toString(), name: d.name })),
    })) {
      send(event.type === 'result' ? 'done' : event.type, event.data);
    }
  } catch (err) {
    console.error('[verify/stream]', err);
    send('error', { message: err.message });
  } finally {
    res.end();
  }
});

module.exports = router;
