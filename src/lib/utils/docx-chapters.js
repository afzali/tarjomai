import { renderAsync } from 'docx-preview';
import { displayNormalizer } from '$lib/utils/normalize-persian.js';

/**
 * @typedef {{ title: string, sourceText: string, level: number }} ParsedChapter
 */

/**
 * Group a flat list of document blocks into chapters.
 *
 * Rules:
 *  - A heading's own text is included at the TOP of the chapter body (so it gets
 *    translated too), not just shown in the sidebar title.
 *  - A heading only becomes its OWN sidebar chapter when it directly has body
 *    paragraphs under it. A heading immediately followed by another heading
 *    (no text in between) is NOT a separate chapter — its text is folded into
 *    the body of the next chapter that does have content.
 *  - Leading paragraphs before any heading form an implicit "متن ابتدایی" chapter.
 *
 * Pure function (no DOM) so it can be unit-tested.
 * @param {{ level: number, text: string }[]} items  level>0 = heading
 * @returns {ParsedChapter[]}
 */
export function groupIntoChapters(items) {
  /** @type {ParsedChapter[]} */
  const chapters = [];

  // Headings seen since the last body paragraph that haven't yet been attached
  // to a chapter. The LAST one becomes the sidebar title; all of them appear in
  // the body text (so chained headings are preserved in order).
  /** @type {{ level: number, text: string }[]} */
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
      // A heading ends the current chapter's body. Any further headings stack up
      // until the next paragraph decides which one titles the next chapter.
      if (current) flush();
      if (it.text) headingBuffer.push({ level: it.level, text: it.text });
    } else {
      if (!it.text) continue;
      if (!current) {
        if (headingBuffer.length > 0) {
          // The most recent heading titles this chapter (in the sidebar)…
          const title = headingBuffer[headingBuffer.length - 1].text;
          current = { title, sourceText: '', level: headingBuffer[headingBuffer.length - 1].level };
          // …but every buffered heading text is kept at the top of the body.
          for (const h of headingBuffer) pending.push(h.text);
          headingBuffer = [];
        } else {
          // Paragraph(s) before any heading → implicit intro chapter
          current = { title: 'متن ابتدایی', sourceText: '', level: 1 };
        }
      }
      pending.push(it.text);
    }
  }

  // Finish the last chapter
  flush();

  // Trailing headings with no body at all: keep them as the body of a final
  // chapter so nothing is lost, but only if there's actual heading text.
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
 * Extract chapters from a .docx file.
 *
 * Strategy: render the document with docx-preview into a hidden container, then
 * walk the resulting block elements, classifying each as a heading or paragraph
 * and delegating the grouping to groupIntoChapters(). All styling/fonts/colors
 * are discarded — we keep only plain, Persian-normalized text.
 *
 * @param {File} file
 * @param {(progress: number) => void} [onProgress]  0..100
 * @returns {Promise<ParsedChapter[]>}
 */
export async function extractChaptersFromDocx(file, onProgress = () => {}) {
  const container = document.createElement('div');
  container.style.display = 'none';
  document.body.appendChild(container);

  try {
    onProgress(5);
    await renderAsync(file, container);
    onProgress(20);

    // docx-preview emits paragraphs/headings as elements with classes like
    // "docx_heading1", "docx_heading2", ... and "docx" for normal paragraphs.
    const elements = Array.from(
      container.querySelectorAll('p, h1, h2, h3, h4, h5, h6')
    );

    /** @type {{ level: number, text: string }[]} */
    const items = [];
    const total = elements.length || 1;
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const level = detectHeadingLevel(el);
      const text = displayNormalizer.normalizeForDisplay(el.textContent || '').trim();
      items.push({ level, text });

      if ((i + 1) % 50 === 0) {
        onProgress(20 + Math.round(((i + 1) / total) * 70));
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    const chapters = groupIntoChapters(items);
    onProgress(100);
    return chapters;
  } finally {
    document.body.removeChild(container);
  }
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

  // Some docx files mark headings via role/aria or style; treat a short, bold,
  // standalone paragraph heuristically is risky, so we keep it as a paragraph.
  return 0;
}

export default extractChaptersFromDocx;
