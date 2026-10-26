'use strict';

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    // Account that owns this record (all queries are scoped to it)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    // Primary document (first in scope) — kept for older conversations/clients
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    documentName: {
      type: String,
      required: true,
    },
    // Full research scope — a conversation can span several documents
    documentIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
      default: [],
      index: true,
    },
    documentNames: {
      type: [String],
      default: [],
    },
    title: {
      type: String,
      default: 'New Conversation',
      trim: true,
      maxlength: 200,
    },
    lastMessage: {
      type: String,
      default: '',
    },
    messageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// History listing: most recently active first per account
conversationSchema.index({ owner: 1, updatedAt: -1 });

conversationSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id        = ret._id.toString();
    ret.documentId = ret.documentId?.toString?.() ?? ret.documentId;
    // Older conversations predate multi-document scope
    ret.documentIds = ret.documentIds?.length
      ? ret.documentIds.map(id => id.toString())
      : [ret.documentId];
    ret.documentNames = ret.documentNames?.length ? ret.documentNames : [ret.documentName];
    ret.timestamp  = ret.updatedAt;
    if (ret.owner) ret.owner = ret.owner.toString();
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Conversation', conversationSchema);
