'use strict';

/**
 * Stats route
 *
 * GET /api/stats   Dashboard KPI aggregation
 */

const router       = require('express').Router();
const Document     = require('../models/Document');
const Conversation = require('../models/Conversation');
const Message      = require('../models/Message');
const Note         = require('../models/Note');

router.get('/', async (req, res) => {
  const mine = { owner: req.userId };

  const [
    totalDocuments,
    processedDocuments,
    totalConversations,
    chunksAgg,
    sizeAgg,
    latencyAgg,
    totalQuestions,
    groundingAgg,
    totalNotes,
  ] = await Promise.all([
    Document.countDocuments(mine),
    Document.countDocuments({ ...mine, status: 'completed' }),
    Conversation.countDocuments(mine),
    Document.aggregate([{ $match: mine }, { $group: { _id: null, total: { $sum: '$chunks' } } }]),
    Document.aggregate([{ $match: mine }, { $group: { _id: null, total: { $sum: '$size'   } } }]),
    Message.aggregate([
      { $match: { ...mine, role: 'assistant', latencyMs: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$latencyMs' } } },
    ]),
    Message.countDocuments({ ...mine, role: 'assistant' }),
    Message.aggregate([
      { $match: { ...mine, role: 'assistant', 'grounding.level': { $exists: true } } },
      { $group: {
          _id: null,
          total:    { $sum: 1 },
          grounded: { $sum: { $cond: [{ $in: ['$grounding.level', ['high', 'medium']] }, 1, 0] } },
      } },
    ]),
    Note.countDocuments(mine),
  ]);

  const totalChunks       = chunksAgg[0]?.total ?? 0;
  const storageBytesTotal = sizeAgg[0]?.total   ?? 0;
  const avgResponseTimeMs = Math.round(latencyAgg[0]?.avg ?? 0);
  const g = groundingAgg[0];
  // Share of answers whose claims were well or partially supported by citations
  const groundedRate      = g?.total ? Math.round((g.grounded / g.total) * 100) : null;

  res.json({
    totalDocuments,
    processedDocuments,
    totalConversations,
    totalChunks,
    storageUsedMB: parseFloat((storageBytesTotal / 1024 / 1024).toFixed(2)),
    avgResponseTimeMs,
    totalQuestions,
    groundedRate,
    totalNotes,
  });
});

module.exports = router;
