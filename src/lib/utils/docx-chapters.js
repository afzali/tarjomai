import { renderAsync } from 'docx-preview';
import { displayNormalizer } from '$lib/utils/normalize-persian.js';

/**
 * @typedef {{ title: string, sourceText: string, level: number }} ParsedChapter
 * @typedef {{ level: number, text: string }} DocItem
 */

/**
 * Group a flat list of document blocks into chapters using the document's own
 * heading structure.
 *
 * Rules:
 *  - A heading's own text is included at the TOP of the chapter body (so it gets
 *    translated too), not just shown in the sidebar title.
 *  - A heading only becomes its OWN sidebar chapter when it directly has body
 *    paragraphs under it. A heading immediately followed by another heading
 *    (no text in between) is folded into the body of the next chapter.
 *  - Leading paragraphs before any heading form an implicit "متن ابتدایی" chapter.
 *
 * Pure function (no DOM) so it can be unit-tested.
 * @param {DocItem[]} items  level>0 = heading
 * @returns {ParsedChapter[]}
 */
export function groupIntoChapters(items) {
  /** @type {ParsedChapter[]} */
  const chapters = [];
  /** @type {DocItem[]} */
  let headingBuffer = [];
  /** @type {ParsedChapter | null} */
  let current = null;
  /** @type {string[]} */
  let pending = [];

  const flush = () => {
    if (!current) return;
    current.sourceText = pending.filter(Boolean).join('\n\n');
    chapters.push(current);
    current = null;
    pending = [];
  };

  for (const it of items) {
    if (it.level > 0) {
      if (current) flush();
      if (it.text) headingBuffer.push({ level: it.level, text: it.text });
    } else {
      if (!it.text) continue;
      if (!current) {
        if (headingBuffer.length > 0) {
          const title = headingBuffer[headingBuffer.length - 1].text;
          current = { title, sourceText: '', level: headingBuffer[headingBuffer.length - 1].level };
          for (const h of headingBuffer) pending.push(h.text);
          headingBuffer = [];
        } else {
          current = { title: 'متن ابتدایی', sourceText: '', level: 1 };
        }
      }
      pending.push(it.text);
    }
  }

  flush();

  if (headingBuffer.length > 0) {
    const title = headingBuffer[headingBuffer.length - 1].text;
    chapters.push({
      title,
      sourceText: headingBuffer.map(h => h.text).filter(Boolean).join('\n\n'),
      level: headingBuffer[headingBuffer.length - 1].level
    });
  }

  return chapters.filter((c) => c.sourceText.trim());
}

/**
 * Fallback grouping when the document has NO heading structure at all.
 * Splits the flat paragraph stream into chunks of roughly `paragraphsPerChapter`
 * paragraphs so the user still gets manageable chapters.
 * @param {DocItem[]} items
 * @param {number} [paragraphsPerChapter=20]
 * @returns {ParsedChapter[]}
 */
export function groupByParagraphChunks(items, paragraphsPerChapter = 20) {
  const paras = items.filter((it) => it.level === 0 && it.text).map((it) => it.text);
  if (paras.length === 0) return [];
  /** @type {ParsedChapter[]} */
  const chapters = [];
  for (let i = 0; i < paras.length; i += paragraphsPerChapter) {
    const slice = paras.slice(i, i + paragraphsPerChapter);
    const n = chapters.length + 1;
    chapters.push({ title: `بخش ${n}`, sourceText: slice.join('\n\n'), level: 1 });
  }
  return chapters;
}

/**
 * Render a .docx file and return its classified block stream plus whether it
 * contains a usable heading structure (a real table of contents). The caller
 * can then decide whether to follow the document's headings or auto-chunk.
 *
 * TOC field entries (docx_toc*) are dropped — they are just a generated index,
 * not real content, so they must not leak into the chapter bodies.
 *
 * @param {File} file
 * @param {(progress: number) => void} [onProgress]  0..100
 * @returns {Promise<{ items: DocItem[], hasHeadings: boolean, headingCount: number }>}
 */
export async function analyzeDocx(file, onProgress = () => {}) {
  const container = document.createElement('div');
  container.style.display = 'none';
  document.body.appendChild(container);

  try {
    onProgress(5);
    await renderAsync(file, container);
    onProgress(20);

    const elements = Array.from(
      container.querySelectorAll('p, h1, h2, h3, h4, h5, h6')
    );

    /** @type {DocItem[]} */
    const items = [];
    let headingCount = 0;
    const total = elements.length || 1;

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];

      // Skip generated table-of-contents field entries entirely
      if (isTocEntry(el)) continue;

      const level = detectHeadingLevel(el);
      const text = displayNormalizer.normalizeForDisplay(el.textContent || '').trim();
      if (level > 0) headingCount++;
      items.push({ level, text });

      if ((i + 1) % 50 === 0) {
        onProgress(20 + Math.round(((i + 1) / total) * 70));
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    onProgress(95);
    return { items, hasHeadings: headingCount > 0, headingCount };
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Extract chapters from a .docx file.
 *
 * @param {File} file
 * @param {(progress: number) => void} [onProgress]  0..100
 * @param {object} [options]
 * @param {'auto'|'headings'|'chunks'} [options.mode='auto']
 *   - 'headings': always follow the document's heading structure (its own TOC)
 *   - 'chunks':   ignore headings, split into fixed-size paragraph chunks
 *   - 'auto':     use headings if the document has them, otherwise chunk
 * @param {number} [options.paragraphsPerChapter=20]  used in chunk mode
 * @returns {Promise<ParsedChapter[]>}
 */
export async function extractChaptersFromDocx(file, onProgress = () => {}, options = {}) {
  const { mode = 'auto', paragraphsPerChapter = 20 } = options;
  const { items, hasHeadings } = await analyzeDocx(file, onProgress);

  let chapters;
  if (mode === 'chunks' || (mode === 'auto' && !hasHeadings)) {
    chapters = groupByParagraphChunks(items, paragraphsPerChapter);
  } else {
    chapters = groupIntoChapters(items);
  }

  onProgress(100);
  return chapters;
}

/**
 * True if an element is a generated table-of-contents field entry produced by
 * docx-preview (class "docx_toc1", "docx_toc2", ...). These are not content.
 * @param {Element} el
 */
function isTocEntry(el) {
  const className = typeof el.className === 'string' ? el.className : '';
  return /docx_toc\d/i.test(className);
}

/**
 * Determine the heading level of an element (1-6), or 0 if it's a normal paragraph.
 * Handles both native <h1>..<h6> and docx-preview's "docx_heading{n}" classes.
 * @param {Element} el
 * @returns {number}
 */
function detectHeadingLevel(el) {
  const tag = el.tagName.toLowerCase();
  if (/^h[1-6]$/.test(tag)) return parseInt(tag[1], 10);

  const className = typeof el.className === 'string' ? el.className : '';
  const m = className.match(/docx_heading(\d+)/i);
  if (m) return Math.min(6, Math.max(1, parseInt(m[1], 10)));

  return 0;
}

export default extractChaptersFromDocx;
