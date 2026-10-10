/**
 * Mark a phrase inside rendered text without touching the DOM, using the
 * CSS Custom Highlight API (styles: `::highlight(<name>)` in app.css).
 * Because nothing is inserted into the markup, Svelte-managed elements and
 * contenteditable blocks stay intact. When the marked text is re-rendered the
 * range collapses and the mark simply disappears.
 */
import { locateSpan } from './text-fix.utils.js';

/** Text nodes under `root`, skipping struck-through diff parts (deleted text). @param {Element} root */
function textNodes(root) {
  /** @type {Text[]} */
  const out = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest('.line-through') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) out.push(/** @type {Text} */ (n));
  return out;
}

/**
 * A Range covering `phrase` inside `root` (tolerant match, see locateSpan),
 * or null when it isn't there.
 * @param {Element | null | undefined} root
 * @param {string} phrase
 */
export function rangeForPhrase(root, phrase) {
  if (!root || !phrase?.trim()) return null;
  const nodes = textNodes(root);
  let full = '';
  /** @type {{ node: Text, start: number }[]} */
  const map = [];
  for (const node of nodes) {
    map.push({ node, start: full.length });
    full += node.data;
  }
  const span = locateSpan(full, phrase);
  if (!span) return null;
  /** @param {number} pos @param {boolean} isEnd */
  const at = (pos, isEnd) => {
    for (let k = map.length - 1; k >= 0; k--) {
      const { node, start } = map[k];
      if (isEnd ? pos > start : pos >= start) return { node, offset: Math.min(pos - start, node.data.length) };
    }
    return { node: map[0].node, offset: 0 };
  };
  const a = at(span.start, false);
  const b = at(span.end, true);
  const range = document.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset);
  return range;
}

/**
 * Scroll `scroller` so `target` (element or Range) sits in its vertical
 * middle; a target taller than the view is aligned to its top instead.
 * @param {Element | null | undefined} scroller
 * @param {Element | Range | null | undefined} target
 */
export function centerInScroller(scroller, target) {
  if (!scroller || !target) return;
  const r = target.getBoundingClientRect();
  const s = scroller.getBoundingClientRect();
  scroller.scrollTop += r.height > s.height * 0.8
    ? r.top - s.top - 16
    : (r.top + r.height / 2) - (s.top + s.height / 2);
}

/** Whether this browser can draw highlights. */
export function highlightsSupported() {
  return typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';
}

/**
 * Replace the highlight `name` with the given ranges (empty → clear).
 * @param {string} name
 * @param {(Range | null)[]} ranges
 */
export function setHighlight(name, ranges) {
  if (!highlightsSupported()) return;
  const list = /** @type {Range[]} */ (ranges.filter(Boolean));
  if (list.length) CSS.highlights.set(name, new Highlight(...list));
  else CSS.highlights.delete(name);
}

/** @param {...string} names */
export function clearHighlights(...names) {
  if (!highlightsSupported()) return;
  for (const n of names) CSS.highlights.delete(n);
}

export default { rangeForPhrase, centerInScroller, highlightsSupported, setHighlight, clearHighlights };
