'use strict';

const mongoose = require('mongoose');
const sourceSchema = require('./sourceSchema');

// A saved finding in the user's notebook — an answer, a fact-check, or a
// hand-written note. Citations [n] in `content` refer to `sources[n-1].index`.
const noteSchema = new mongoose.Schema(
  {
    // Account that owns this record (all queries are scoped to it)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    kind: {
      type: String,
      enum: ['answer', 'factcheck', 'manual'],
      default: 'manual',
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    question: {
      type: String,
      default: '',
    },
    content: {
      type: String,
      default: '',
      maxlength: 20000,
    },
    sources: {
      type: [sourceSchema],
      default: [],
    },
    documentNames: {
      type: [String],
      default: [],
    },
    // Where it came from, for "open in chat"
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
    },
    documentIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Notebook listing: newest first per account
noteSchema.index({ owner: 1, createdAt: -1 });

noteSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.documentIds = (ret.documentIds ?? []).map(String);
    ret.conversationId = ret.conversationId?.toString() ?? null;
    if (ret.owner) ret.owner = ret.owner.toString();
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Note', noteSchema);
