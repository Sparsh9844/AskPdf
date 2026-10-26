'use strict';

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');
const { UPLOAD_DIR, MAX_FILE_SIZE_MB } = require('../config/env');

// ── Ensure uploads dir exists ─────────────────────────────────────────────────
const uploadRoot = path.resolve(UPLOAD_DIR);
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });

// ── Supported extensions (must match utils/documentParser.js) ────────────────
const ALLOWED_EXTS = new Set([
  '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt', '.md', '.markdown',
]);

// ── Multer disk storage ───────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadRoot);
  },
  filename(_req, file, cb) {
    const ext  = path.extname(file.originalname).toLowerCase() || '.pdf';
    const safe = uuidv4() + ext;
    cb(null, safe);
  },
});

// ── File filter ───────────────────────────────────────────────────────────────
function fileFilter(_req, file, cb) {
  const ext     = path.extname(file.originalname).toLowerCase();
  // The parser dispatches on the extension, so it must be one we can read.
  // Browsers often send generic MIME types (e.g. application/octet-stream),
  // so the MIME type alone is not required to match.
  const allowed = ALLOWED_EXTS.has(ext);

  if (allowed) return cb(null, true);

  cb(
    Object.assign(
      new Error(`Unsupported file type "${ext}". Allowed: PDF, DOCX, DOC, XLSX, XLS, CSV, TXT, MD`),
      { status: 400 }
    )
  );
}

// ── Multer instance ───────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
});

/**
 * Delete a file from disk (fire-and-forget)
 * @param {string} filePath
 */
function deleteFile(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
  fs.unlink(abs, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('[storage] Failed to delete file:', abs, err.message);
    }
  });
}

module.exports = { upload, deleteFile, uploadRoot, ALLOWED_EXTS };
