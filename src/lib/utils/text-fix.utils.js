/**
 * Helpers for applying AI-suggested fixes to a text with one click.
 *
 * A fix is a pair { original, suggested }: `original` is a span the model
 * copied from the current text and `suggested` replaces it. Models rarely copy
 * Persian text byte-for-byte (ZWNJ ↔ space, ي/ی, ك/ک, «» ↔ "", diacritics,
 * a missing final period…), so locating the span is tolerant: we first try an
 * exact match, then a canonicalised match that is mapped back to the real
 * offsets in the original string.
 */

const DIACRITICS = /[ً-ْٰـ]/;
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EDGE_PUNCT = /^[\s.,،؛;:!?؟…"'«»()\-–—]+|[\s.,،؛;:!?؟…"'«»()\-–—]+$/g;

/**
 * Canonical form of one character for matching ('' = ignore it).
 * @param {string} ch
 */
function canonChar(ch) {
  if (DIACRITICS.test(ch)) return '';
  switch (ch) {
    case 'ي': case 'ى': return 'ی';
    case 'ك': return 'ک';
    case '‌': case ' ': return ' ';
    case '‎': case '‏': return '';
    case '«': case '»': case '“': case '”': case '„': return '"';
    case '‘': case '’': case '`': return "'";
  }
  let i = PERSIAN_DIGITS.indexOf(ch);
  if (i !== -1) return String(i);
  i = ARABIC_DIGITS.indexOf(ch);
  if (i !== -1) return String(i);
  if (/\s/.test(ch)) return ' ';
  const lower = ch.toLowerCase();
  return lower.length === 1 ? lower : ch;
}

/**
 * Canonicalise a string and keep a map from each canonical char back to its
 * index in the source string. Whitespace runs collapse to one space.
 * @param {string} text
 */
function canonicalize(text) {
  let out = '';
  /** @type {number[]} */
  const map = [];
  let lastSpace = true; // drops leading whitespace
  for (let i = 0; i < text.length; i++) {
    const c = canonChar(text[i]);
    if (!c) continue;
    if (c === ' ') {
      if (lastSpace) continue;
      lastSpace = true;
    } else {
      lastSpace = false;
    }
    out += c;
    map.push(i);
  }
  if (out.endsWith(' ')) { out = out.slice(0, -1); map.pop(); }
  return { out, map };
}

/**
 * Find `needle` inside `text`. Returns real offsets in `text`, or null.
 * `trimmed` is set when the match only worked after dropping edge
 * punctuation from the needle (e.g. the model added a final period).
 * @param {string} text
 * @param {string} needle
 * @returns {{ start: number, end: number, trimmed: boolean } | null}
 */
export function locateSpan(text, needle) {
  if (!text || !needle || !needle.trim()) return null;

  const exact = text.indexOf(needle);
  if (exact !== -1) return { start: exact, end: exact + needle.length, trimmed: false };

  const t = needle.trim();
  const trimmedExact = text.indexOf(t);
  if (trimmedExact !== -1) return { start: trimmedExact, end: trimmedExact + t.length, trimmed: false };

  const hay = canonicalize(text);
  const tryCanon = (/** @type {string} */ n, /** @type {boolean} */ trimmed) => {
    const nc = canonicalize(n).out;
    if (!nc) return null;
    const j = hay.out.indexOf(nc);
    if (j === -1) return null;
    const start = hay.map[j];
    let end = hay.map[j + nc.length - 1] + 1;
    // Swallow diacritics / direction marks that sit right after the match so
    // the replacement doesn't leave an orphaned mark behind.
    while (end < text.length && canonChar(text[end]) === '') end++;
    return { start, end, trimmed };
  };

  return tryCanon(needle, false) || tryCanon(needle.replace(EDGE_PUNCT, ''), true);
}

/**
 * Replace `original` with `suggested` in `text`.
 * - Empty `original` only applies to an empty text (whole-paragraph insert).
 * - When the match needed edge-punctuation trimming, the same trailing
 *   punctuation is trimmed from `suggested` so we don't double it.
 * @param {string} text
 * @param {string} original
 * @param {string} suggested
 * @returns {string | null} the new text, or null if `original` wasn't found
 */
export function applyTextFix(text, original, suggested) {
  const cur = text || '';
  if (!original || !original.trim()) {
    return cur.trim() ? null : (suggested || '');
  }
  const span = locateSpan(cur, original);
  if (!span) return null;
  let replacement = suggested ?? '';
  if (span.trimmed) {
    const matched = cur.slice(span.start, span.end);
    const tail = (original.trim().match(/[.,،؛;:!?؟…"'«»)]+$/) || [''])[0];
    if (tail && !matched.endsWith(tail) && replacement.trimEnd().endsWith(tail)) {
      replacement = replacement.trimEnd().slice(0, -tail.length);
    }
  }
  return cur.slice(0, span.start) + replacement + cur.slice(span.end);
}

/**
 * Word-level diff (LCS) for previewing a fix.
 * @param {string} oldText
 * @param {string} newText
 * @returns {{ type: 'equal'|'insert'|'delete', text: string }[]}
 */
export function wordDiff(oldText, newText) {
  const tokenize = (/** @type {string} */ s) => (s || '').split(/(\s+)/).filter(x => x.length > 0);
  const a = tokenize(oldText);
  const b = tokenize(newText);
  const n = a.length, m = b.length;
  /** @type {number[][]} */
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  /** @type {{ type: 'equal'|'insert'|'delete', text: string }[]} */
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ type: 'equal', text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: 'delete', text: a[i] }); i++; }
    else { out.push({ type: 'insert', text: b[j] }); j++; }
  }
  while (i < n) out.push({ type: 'delete', text: a[i++] });
  while (j < m) out.push({ type: 'insert', text: b[j++] });

  /** @type {{ type: 'equal'|'insert'|'delete', text: string }[]} */
  const merged = [];
  for (const seg of out) {
    const last = merged[merged.length - 1];
    if (last && last.type === seg.type) last.text += seg.text;
    else merged.push({ ...seg });
  }
  return merged;
}

/**
 * Plain snapshot of some fields of an object (undefined fields omitted).
 * Used to undo a fix exactly: store the block's fields before and after.
 * @param {any} obj
 * @param {string[]} fields
 */
export function pickFields(obj, fields) {
  /** @type {Record<string, any>} */
  const out = {};
  for (const k of fields) if (obj?.[k] !== undefined) out[k] = obj[k];
  return JSON.parse(JSON.stringify(out));
}

/** @param {any} obj @param {any} snapshot @param {string[]} fields */
export function sameFields(obj, snapshot, fields) {
  return JSON.stringify(pickFields(obj, fields)) === JSON.stringify(snapshot);
}

/** Copy of `obj` with `fields` set back to `snapshot`. @param {any} obj @param {any} snapshot @param {string[]} fields */
export function restoreFields(obj, snapshot, fields) {
  const out = { ...obj };
  for (const k of fields) {
    if (k in snapshot) out[k] = snapshot[k];
    else delete out[k];
  }
  return out;
}

export default { locateSpan, applyTextFix, wordDiff, pickFields, sameFields, restoreFields };
