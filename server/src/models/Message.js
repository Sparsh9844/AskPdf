'use strict';

const mongoose = require('mongoose');

const sourceSchema = require('./sourceSchema');

const messageSchema = new mongoose.Schema(
  {
    // Account that owns this record (all queries are scoped to it)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    // Only populated on assistant messages
    sources: {
      type: [sourceSchema],
      default: [],
    },
    // Latency tracking for dashboard stats
    latencyMs: {
      type: Number,
      default: null,
    },
    // ── Research-engine metadata (assistant messages only) ──────────────────
    mode: {
      type: String,
      enum: ['quick', 'deep'],
      default: 'quick',
    },
    // The steps the engine took: rewrite → plan → retrieve → synthesize → verify
    trace: {
      type: [{
        _id: false,
        kind:       String,
        label:      String,
        detail:     String,
        items:      [String],
        durationMs: Number,
      }],
      default: [],
    },
    grounding: {
      level:      { type: String, enum: ['high', 'medium', 'low', 'none'] },
      score:      Number,   // 0–1
      citedCount: Number,
    },
    followUps: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// History is always read per conversation in time order
messageSchema.index({ conversationId: 1, createdAt: 1 });

messageSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id        = ret._id.toString();
    ret.timestamp  = ret.createdAt;
    ret.conversationId = ret.conversationId?.toString?.() ?? ret.conversationId;
    if (ret.owner) ret.owner = ret.owner.toString();
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Message', messageSchema);
