'use strict';

const mongoose = require('mongoose');

// A single retrieved source chunk attached to an AI response
const sourceSchema = new mongoose.Schema(
  {
    index:        { type: Number },          // citation number used in the answer: [index]
    documentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    documentName: { type: String },
    pageNumber:   { type: Number },
    pageEnd:      { type: Number },
    chunkIndex:   { type: Number },
    snippet:      { type: String },
    score:        { type: Number, min: 0, max: 1 },
    cited:        { type: Boolean, default: false },  // referenced in the answer text
  },
  { _id: true, versionKey: false }
);

sourceSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

module.exports = sourceSchema;
