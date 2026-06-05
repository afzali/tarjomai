/**
 * Glossary helpers: chunking long text, parsing model JSON output,
 * de-duplicating terms, and rendering the glossary into a translation prompt.
 *
 * A glossary entry has the shape:
 *   { source: string, target: string, note?: string }
 */

/**
 * Decide how many chunks a text should be split into, based on its length.
 * Keeps each chunk within a model-friendly size (~10k chars) so extraction
 * stays high-quality without overflowing context.
 * @param {string} text
 * @param {number} [charsPerChunk] target characters per chunk
 * @returns {number} chunk count (>= 1)
 */
export function autoChunkCount(text, charsPerChunk = 10000) {
  const len = (text || '').trim().length;
  if (len === 0) return 1;
  return Math.max(1, Math.ceil(len / charsPerChunk));
}

/**
 * Split a long text into N roughly-equal chunks, breaking on paragraph
 * boundaries where possible so terms keep their context.
 * @param {string} text
 * @param {number} chunkCount  desired number of chunks (>= 1)
 * @returns {string[]}
 */
export function chunkText(text, chunkCount) {
  const clean = (text || '').trim();
  if (!clean) return [];
  const n = Math.max(1, Math.floor(chunkCount) || 1);
  if (n === 1) return [clean];

  // Split into paragraphs first (keep them whole)
  const paragraphs = clean.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

  // If there are fewer paragraphs than chunks, fall back to splitting by length.
  if (paragraphs.length < n) {
    return splitByLength(clean, n);
  }

  const targetLen = clean.length / n;
  /** @type {string[]} */
  const chunks = [];
  let current = '';

  for (const p of paragraphs) {
    if (current && (current.length + p.length) > targetLen && chunks.length < n - 1) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

/**
 * Fallback: split text into n parts by character length (on whitespace).
 * @param {string} text
 * @param {number} n
 * @returns {string[]}
 */
function splitByLength(text, n) {
  const size = Math.ceil(text.length / n);
  /** @type {string[]} */
  const chunks = [];
  let start = 0;
  while (start < text.length && chunks.length < n) {
    let end = Math.min(start + size, text.length);
    // Try to break on the next whitespace to avoid cutting words
    if (end < text.length) {
      const ws = text.indexOf(' ', end);
      if (ws !== -1 && ws - end < 200) end = ws;
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks.filter(Boolean);
}

/**
 * Parse a model response into an array of glossary entries.
 * Tolerates code fences and surrounding prose. Accepts the canonical
 * {source,target,note} shape as well as common alternatives
 * (persian/arabic/context_note, term/translation, etc.).
 * @param {string} content
 * @returns {Array<{source:string,target:string,note:string}>}
 */
export function parseGlossaryResponse(content) {
  if (!content) return [];
  let text = String(content).trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Grab the first [...] array if there's extra prose
  const match = text.match(/\[[\s\S]*\]/);
  if (match) text = match[0];

  /** @type {any} */
  let data;
  try { data = JSON.parse(text); } catch { return []; }
  if (!Array.isArray(data)) {
    // Maybe a single object or { entries: [...] }
    if (data && Array.isArray(data.entries)) data = data.entries;
    else if (data && typeof data === 'object') data = [data];
    else return [];
  }

  /** @type {Array<{source:string,target:string,note:string}>} */
  const out = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const source = pick(item, ['source', 'persian', 'fa', 'term', 'original', 'word', 'src']);
    const target = pick(item, ['target', 'arabic', 'ar', 'translation', 'equivalent', 'meaning', 'tgt']);
    const note = pick(item, ['note', 'context_note', 'context', 'description', 'usage', 'explanation']);
    if (source && target) {
      out.push({ source: source.trim(), target: target.trim(), note: (note || '').trim() });
    }
  }
  return out;
}

/**
 * @param {Record<string, any>} obj
 * @param {string[]} keys
 * @returns {string}
 */
function pick(obj, keys) {
  for (const k of keys) {
    if (obj[k] != null && String(obj[k]).trim()) return String(obj[k]);
  }
  return '';
}

/**
 * Merge entries and remove duplicates (case-insensitive on the source term).
 * Later, non-empty notes win; existing entries are preserved otherwise.
 * @param {Array<{source:string,target:string,note?:string}>} existing
 * @param {Array<{source:string,target:string,note?:string}>} incoming
 * @returns {Array<{source:string,target:string,note:string}>}
 */
export function mergeGlossaries(existing, incoming) {
  /** @type {Map<string, {source:string,target:string,note:string}>} */
  const map = new Map();
  const add = (/** @type {any} */ e) => {
    if (!e || !e.source || !e.target) return;
    const key = e.source.trim().toLowerCase();
    const note = (e.note || '').trim();
    if (map.has(key)) {
      const prev = map.get(key);
      // Fill in a note if the existing one is empty
      if (prev && !prev.note && note) prev.note = note;
    } else {
      map.set(key, { source: e.source.trim(), target: e.target.trim(), note });
    }
  };
  for (const e of existing || []) add(e);
  for (const e of incoming || []) add(e);
  return Array.from(map.values());
}

/**
 * Render the glossary into a compact, prompt-friendly block to append to a
 * translation system message. Returns '' when the glossary is empty.
 * @param {Array<{source:string,target:string,note?:string}>} entries
 * @returns {string}
 */
export function buildGlossaryPromptSection(entries) {
  const list = (entries || []).filter(e => e && e.source && e.target);
  if (list.length === 0) return '';
  const lines = list.map(e => {
    const note = (e.note || '').trim();
    return `- ${e.source} → ${e.target}${note ? `  (${note})` : ''}`;
  });
  return `واژه‌نامه‌ی الزامی (برای یکدستی ترجمه، این معادل‌ها را دقیقاً رعایت کن):
${lines.join('\n')}`;
}

/**
 * Normalize text for fuzzy matching: drop Arabic/Persian diacritics, unify
 * common letter variants (ي/ی, ك/ک, ة/ه, آ/ا, ؤئإأ → ا/و/ی), turn ZWNJ and
 * punctuation into spaces, and collapse whitespace.
 * @param {string} s
 * @returns {string}
 */
function normalizeForMatch(s) {
  return String(s || '')
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')      // harakat + tatweel
    .replace(/[يىئ]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ةه]/g, 'ه')
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ؤو]/g, 'و')
    .replace(/[\u200C\u200F\u200E]/g, ' ')             // ZWNJ / direction marks
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')                 // punctuation → space
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Select only the glossary entries whose source term is relevant to the given
 * text, so we don't send the entire glossary on every request.
 *
 * Matching is fuzzy/normalized: diacritics and letter variants are ignored.
 * A term matches if (a) its normalized form appears as a substring of the
 * normalized text, or (b) "enough" of its words appear in the text (covers
 * inflected/partial forms — the "شبیه" case the user asked for).
 *
 * @param {Array<{source:string,target:string,note?:string}>} entries
 * @param {string} text
 * @returns {Array<{source:string,target:string,note?:string}>}
 */
export function filterGlossaryForText(entries, text) {
  const list = (entries || []).filter(e => e && e.source && e.target);
  if (list.length === 0 || !text) return [];
  const hay = normalizeForMatch(text);
  if (!hay) return [];
  const haySet = new Set(hay.split(' ').filter(Boolean));

  return list.filter((e) => {
    const term = normalizeForMatch(e.source);
    if (!term) return false;
    // Whole-term substring hit (catches multi-word terms appearing verbatim)
    if (hay.includes(term)) return true;
    // Word-overlap: keep the term if a good share of its words occur in the text
    const words = term.split(' ').filter(w => w.length >= 2);
    if (words.length === 0) {
      // very short term (1 char or digits) → only the substring test applies
      return false;
    }
    let hits = 0;
    for (const w of words) {
      // exact word, or any text word that contains/startsWith it (inflections)
      if (haySet.has(w)) { hits++; continue; }
      for (const hw of haySet) {
        if (hw.length >= 3 && (hw.includes(w) || w.includes(hw))) { hits++; break; }
      }
    }
    // require at least ~60% of the term's words to be present
    return hits / words.length >= 0.6;
  });
}

export default {
  autoChunkCount,
  chunkText,
  parseGlossaryResponse,
  mergeGlossaries,
  buildGlossaryPromptSection,
  filterGlossaryForText
};
