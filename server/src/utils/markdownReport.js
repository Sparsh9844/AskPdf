'use strict';

/**
 * markdownReport.js — turn cited findings into a portable Markdown report.
 *
 * Each section's [n] citations are renumbered into one global reference list
 * at the end, so the exported file reads like a properly footnoted document.
 */

const CITATION_RE = /\[(\d+(?:\s*[,–-]\s*\d+)*)\]/g;

function pagesLabel(src) {
  return src.pageEnd && src.pageEnd !== src.pageNumber
    ? `pp. ${src.pageNumber}–${src.pageEnd}` : `p. ${src.pageNumber}`;
}

/**
 * @param {object}   p
 * @param {string}   p.title
 * @param {string}   [p.subtitle]
 * @param {{ heading:string, question?:string, content:string, sources?:object[] }[]} p.sections
 * @returns {string}
 */
function buildReport({ title, subtitle, sections }) {
  const refs   = [];          // global reference list
  const refKey = new Map();   // "docId:chunk" → global number

  const globalNumber = (src) => {
    const key = `${src.documentId}:${src.chunkIndex}:${src.pageNumber}`;
    if (!refKey.has(key)) {
      refs.push(src);
      refKey.set(key, refs.length);
    }
    return refKey.get(key);
  };

  const out = [`# ${title}`, ''];
  if (subtitle) out.push(`_${subtitle}_`, '');

  for (const s of sections) {
    const byIndex = new Map((s.sources ?? []).map((src, i) => [src.index ?? i + 1, src]));
    const body = (s.content ?? '').replace(CITATION_RE, (_m, inner) => {
      const nums = [];
      for (const part of inner.split(',')) {
        const [a, b = a] = part.split(/[–-]/).map(n => parseInt(n, 10));
        for (let n = a; n <= b && n - a < 20; n++) {
          const src = byIndex.get(n);
          if (src) nums.push(globalNumber(src));
        }
      }
      return nums.length ? nums.map(n => `[${n}]`).join('') : '';
    });

    out.push(`## ${s.heading}`, '');
    if (s.question && s.question !== s.heading) out.push(`> **Q:** ${s.question}`, '');
    out.push(body.trim(), '');
  }

  if (refs.length) {
    out.push('---', '', '## References', '');
    refs.forEach((src, i) => {
      const snippet = (src.snippet ?? '').replace(/\s+/g, ' ').trim().slice(0, 220);
      out.push(`${i + 1}. **${src.documentName}**, ${pagesLabel(src)}: “${snippet}${snippet.length >= 220 ? '…' : ''}”`);
    });
    out.push('');
  }

  out.push(`_Exported from Insight on ${new Date().toISOString().slice(0, 10)}._`, '');
  return out.join('\n');
}

/** Safe ASCII filename for Content-Disposition. */
function fileName(base) {
  return `${(base || 'insight-report').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'insight-report'}.md`;
}

module.exports = { buildReport, fileName };
