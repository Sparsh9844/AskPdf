'use strict';

const mongoose = require('mongoose');

// One embedded passage — used by the MongoDB vector store backend
// (services/vectorStores/mongoStore.js). Not used when Qdrant is active.
const chunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    chunkIndex: { type: Number, required: true },
    text:       { type: String, required: true },
    pageNumber: { type: Number, default: 1 },
    pageEnd:    { type: Number, default: 1 },
    charStart:  { type: Number, default: 0 },
    charEnd:    { type: Number, default: 0 },
    embedding:  { type: [Number], required: true },
  },
  { versionKey: false }
);

chunkSchema.index({ documentId: 1, chunkIndex: 1 }, { unique: true });

module.exports = mongoose.model('Chunk', chunkSchema);
