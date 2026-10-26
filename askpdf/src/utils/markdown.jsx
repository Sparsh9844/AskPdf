/**
 * markdown.jsx — small, dependency-free markdown renderer for AI answers.
 *
 * Supports: headings (#–####), paragraphs, unordered/ordered lists, tables,
 * fenced code, **bold**, *italic*, `code`, and citation markers — [1], [1, 3],
 * [2-4], [1][2] — which are handed to `renderCitation(n, key)` so the caller
 * can render interactive chips. Safe for partially streamed text.
 */

const INLINE_RE = /(\*\*[^*]+\*\*|`[^`]+`|\[\d+(?:\s*[,–-]\s*\d+)*\]|\*[^*\s][^*]*\*)/g;

/** Expand "1, 3" / "2-4" into [1, 3] / [2, 3, 4]. */
function expandCitation(body) {
  const out = [];
  for (const part of body.split(',')) {
    const [a, b = a] = part.split(/[–-]/).map(n => parseInt(n, 10));
    for (let n = a; n <= b && n - a < 20; n++) out.push(n);
  }
  return out;
}

function renderInline(text, renderCitation, keyPrefix) {
  return text.split(INLINE_RE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
      return <strong key={key} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
      return <code key={key} className="px-1 py-0.5 rounded bg-gray-100 text-[0.85em] font-mono text-gray-800">{part.slice(1, -1)}</code>;
    if (/^\[\d/.test(part) && part.endsWith(']')) {
      const nums = expandCitation(part.slice(1, -1));
      return renderCitation
        ? <span key={key} className="inline-flex gap-0.5 align-baseline">{nums.map(n => renderCitation(n, `${key}-${n}`))}</span>
        : part;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
      return <em key={key}>{part.slice(1, -1)}</em>;
    return part;
  });
}

const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l);
const isDivider  = (l) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(l);
const ulMatch    = (l) => l.match(/^\s*[-*•]\s+(.*)$/);
const olMatch    = (l) => l.match(/^\s*(\d+)[.)]\s+(.*)$/);

/**
 * @param {string} text
 * @param {{ renderCitation?: (n:number, key:string) => React.ReactNode }} [opts]
 * @returns {React.ReactNode[]}
 */
export function renderMarkdown(text, { renderCitation } = {}) {
  const lines = (text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  const inline = (t, k) => renderInline(t, renderCitation, k);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key  = `b${i}`;

    // Fenced code
    if (line.trim().startsWith('```')) {
      const body = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) body.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={key} className="my-2 p-3 rounded-lg bg-gray-900 text-gray-100 text-xs overflow-x-auto">
          <code>{body.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Blank
    if (!line.trim()) { i++; continue; }

    // Heading
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const cls = level <= 2
        ? 'text-[15px] font-semibold text-gray-900 mt-4 mb-1.5 first:mt-0'
        : 'text-sm font-semibold text-gray-900 mt-3 mb-1 first:mt-0';
      blocks.push(<p key={key} className={cls} role="heading" aria-level={level}>{inline(h[2], key)}</p>);
      i++;
      continue;
    }

    // Table
    if (isTableRow(line)) {
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) rows.push(lines[i++]);
      const cells = rows
        .filter(r => !isDivider(r))
        .map(r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
      const [head, ...body] = cells;
      blocks.push(
        <div key={key} className="overflow-x-auto my-3">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr>{head?.map((c, j) => (
                <th key={j} className="text-left px-3 py-2 bg-gray-50 font-semibold text-gray-700 border border-gray-200">{inline(c, `${key}h${j}`)}</th>
              ))}</tr>
            </thead>
            <tbody>
              {body.map((row, r) => (
                <tr key={r}>{row.map((c, j) => (
                  <td key={j} className="px-3 py-2 border border-gray-200 text-gray-700 align-top">{inline(c, `${key}r${r}c${j}`)}</td>
                ))}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Lists
    if (ulMatch(line) || olMatch(line)) {
      const ordered = !!olMatch(line) && !ulMatch(line);
      const items = [];
      while (i < lines.length) {
        const m = ordered ? olMatch(lines[i]) : ulMatch(lines[i]);
        if (m) { items.push(ordered ? m[2] : m[1]); i++; continue; }
        // continuation line (indented, non-empty) belongs to previous item
        if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) {
          items[items.length - 1] += ' ' + lines[i].trim();
          i++;
          continue;
        }
        break;
      }
      const Tag = ordered ? 'ol' : 'ul';
      blocks.push(
        <Tag key={key} className={`my-1.5 pl-5 space-y-1 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-gray-400`}>
          {items.map((it, j) => <li key={j} className="text-sm leading-relaxed pl-0.5">{inline(it, `${key}i${j}`)}</li>)}
        </Tag>
      );
      continue;
    }

    // Paragraph — merge consecutive plain lines
    const para = [line];
    i++;
    while (
      i < lines.length && lines[i].trim() &&
      !/^(#{1,4})\s/.test(lines[i]) && !isTableRow(lines[i]) &&
      !ulMatch(lines[i]) && !olMatch(lines[i]) && !lines[i].trim().startsWith('```')
    ) para.push(lines[i++]);
    blocks.push(<p key={key} className="text-sm leading-relaxed my-1.5 first:mt-0 last:mb-0">{inline(para.join(' '), key)}</p>);
  }

  return blocks;
}
