'use strict';

const mongoose = require('mongoose');
const { STAGES } = require('../config/constants');

// AI-generated "intelligence brief" produced during the analyzing stage
const briefSchema = new mongoose.Schema(
  {
    documentType:       { type: String, default: '' },
    summary:            { type: String, default: '' },
    keyPoints:          { type: [String], default: [] },
    topics:             { type: [String], default: [] },
    entities: {
      type: [{ _id: false, name: String, type: { type: String } }],
      default: [],
    },
    keyFigures: {
      type: [{ _id: false, label: String, value: String, page: Number }],
      default: [],
    },
    suggestedQuestions: { type: [String], default: [] },
    generatedAt:        { type: Date, default: Date.now },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    // Account that owns this record (all queries are scoped to it)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      default: 'application/pdf',
    },
    size: {
      type: Number,
      required: true,
    },
    pages: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [...STAGES, 'error', 'pending'],
      default: 'uploading',
    },
    errorMessage: {
      type: String,
      default: null,
    },
    chunks: {
      type: Number,
      default: 0,
    },
    embeddings: {
      type: Number,
      default: 0,
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    brief: {
      type: briefSchema,
      default: null,
    },
    // Set when brief generation fails — the document stays usable for Q&A
    briefError: {
      type: String,
      default: null,
    },
    // denormalised conversation count — incremented on creation/deletion
    conversations: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,       // createdAt = uploadedAt, updatedAt
    versionKey: false,
  }
);

// Library listing: newest first per account
documentSchema.index({ owner: 1, createdAt: -1 });

// Virtual so the frontend field name "uploadedAt" works transparently
documentSchema.virtual('uploadedAt').get(function () {
  return this.createdAt;
});

documentSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    if (ret.owner) ret.owner = ret.owner.toString();
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Document', documentSchema);
