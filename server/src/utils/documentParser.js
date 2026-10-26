'use strict';

/**
 * documentParser.js
 *
 * Unified text extractor for all supported file types:
 *   .pdf   — pdf-parse@1.1.1 (per-page text via a custom pagerender)
 *   .docx  — mammoth
 *   .doc   — mammoth (best-effort; older binary format)
 *   .txt   — plain fs.readFileSync
 *   .md    — plain fs.readFileSync
 *   .xlsx  — xlsx (SheetJS)
 *   .xls   — xlsx (SheetJS)
 *   .csv   — xlsx (SheetJS)
 *
 * Returns { text: string, pages: number, pageTexts: string[] }
 * pageTexts is exact for PDF; for other formats text is split into
 * ~3000-char "pages" on paragraph/line boundaries so citations stay useful.
 */

const fs   = require('fs');
const path = require('path');

const PSEUDO_PAGE_CHARS = 3000;

/** Split flowing text into pseudo-pages without cutting mid-line. */
function paginate(text) {
  const pages = [];
  let rest = text || '';
  while (rest.length > PSEUDO_PAGE_CHARS) {
    let cut = rest.lastIndexOf('\n', PSEUDO_PAGE_CHARS);
    if (cut < PSEUDO_PAGE_CHARS * 0.5) cut = rest.lastIndexOf(' ', PSEUDO_PAGE_CHARS);
    if (cut <= 0) cut = PSEUDO_PAGE_CHARS;
    pages.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest.trim() || pages.length === 0) pages.push(rest);
  return pages;
}

function fromText(text) {
  const pageTexts = paginate(text);
  return { text, pages: pageTexts.length, pageTexts };
}

// ── PDF ───────────────────────────────────────────────────────────────────────
async function parsePdf(filePath) {
  const pdfParse  = require('pdf-parse');
  const buffer    = fs.readFileSync(filePath);
  const pageTexts = [];

  // Same line-joining logic as pdf-parse's default renderer, but we keep
  // each page separately. pdf-parse renders pages sequentially.
  const pagerender = async (pageData) => {
    const content = await pageData.getTextContent({
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    });
    let lastY, text = '';
    for (const item of content.items) {
      if (lastY === item.transform[5] || !lastY) text += item.str;
      else text += '\n' + item.str;
      lastY = item.transform[5];
    }
    pageTexts.push(text);
    return text;
  };

  const data = await pdfParse(buffer, { max: 0, pagerender });
  return {
    text:  data.text || '',
    pages: data.numpages || pageTexts.length || 1,
    pageTexts,
  };
}

// ── DOCX / DOC ────────────────────────────────────────────────────────────────
async function parseDocx(filePath) {
  const mammoth = require('mammoth');
  const result  = await mammoth.extractRawText({ path: filePath });
  return fromText(result.value || '');
}

// ── TXT / MD ──────────────────────────────────────────────────────────────────
function parsePlainText(filePath) {
  return fromText(fs.readFileSync(filePath, 'utf8'));
}

// ── XLSX / XLS / CSV ──────────────────────────────────────────────────────────
// Each sheet starts on its own page so citations map to sheets.
function parseSpreadsheet(filePath) {
  const XLSX      = require('xlsx');
  const workbook  = XLSX.readFile(filePath);
  const pageTexts = [];

  workbook.SheetNames.forEach(sheetName => {
    const lines = [`=== Sheet: ${sheetName} ===`];
    const rows  = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
    rows.forEach(row => {
      const line = row.map(c => String(c ?? '').trim()).join('\t');
      if (line.trim()) lines.push(line);
    });
    pageTexts.push(...paginate(lines.join('\n')));
  });

  return { text: pageTexts.join('\n\n'), pages: pageTexts.length, pageTexts };
}

// ── Main dispatcher ───────────────────────────────────────────────────────────
/**
 * Parse any supported document and return its text content.
 *
 * @param {string} filePath  Absolute path to the file on disk
 * @returns {Promise<{ text: string, pages: number, pageTexts: string[] }>}
 */
async function parseDocument(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.pdf':
      return parsePdf(filePath);

    case '.docx':
    case '.doc':
      return parseDocx(filePath);

    case '.txt':
    case '.md':
    case '.markdown':
      return parsePlainText(filePath);

    case '.xlsx':
    case '.xls':
    case '.csv':
      return parseSpreadsheet(filePath);

    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

module.exports = { parseDocument };
