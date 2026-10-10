/**
 * Where a chapter stands with its "بررسی کلی" (structured review), for the
 * status dot in the chapter list.
 *
 *  - none:       never reviewed
 *  - incomplete: review not finished (parts left), findings still open
 *                (neither applied nor rejected), or the text moved on since
 *                the review: new paragraphs it never saw, or paragraphs whose
 *                text changed substantially (e.g. re-translated)
 *  - complete:   every part reviewed, every finding handled, text unchanged
 */

/** Word tokens for a rough similarity check. @param {string} s */
function tokens(s) {
  return String(s || '')
    .replace(/[ً-ْٰـ‌‎‏]/g, ' ')
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .split(/[\s.,،؛;:!?؟…"'«»()\[\]\-–—]+/)
    .filter(Boolean);
}

/**
 * Whether `now` differs substantially from `then`: small hand edits (a few
 * words) don't count, a re-translation or a newly filled paragraph does.
 * @param {string} then
 * @param {string} now
 */
export function changedSubstantially(then, now) {
  if ((then || '') === (now || '')) return false;
  const a = tokens(then), b = tokens(now);
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const t of a) counts.set(t, (counts.get(t) || 0) + 1);
  let common = 0;
  for (const t of b) {
    const c = counts.get(t) || 0;
    if (c > 0) { common++; counts.set(t, c - 1); }
  }
  const total = a.length + b.length;
  if (total === 0) return false;
  const dice = (2 * common) / total;
  const differing = total - 2 * common;
  return dice < 0.75 && differing >= 4;
}

/**
 * @param {any} run - latest review run of the chapter (or null)
 * @param {{ id: string, source: string, target: string }[]} units - the chapter now, on the run's layer
 * @returns {{ state: 'none'|'incomplete'|'complete', running: boolean, partsLeft: number, open: number, critical: number, changed: number, uncovered: number }}
 */
export function reviewState(run, units) {
  const empty = { state: /** @type {const} */ ('none'), running: false, partsLeft: 0, open: 0, critical: 0, changed: 0, uncovered: 0 };
  if (!run) return empty;

  const partsLeft = (run.parts || []).filter((/** @type {any} */ p) => p.status !== 'done').length;
  const openIssues = (run.issues || []).filter((/** @type {any} */ i) => i.status === 'open');
  const covered = new Set((run.parts || []).flatMap((/** @type {any} */ p) => p.blockIds || []));
  const reviewed = run.reviewed || {};

  let changed = 0, uncovered = 0;
  for (const u of units) {
    if (!u.source?.trim() && !u.target?.trim()) continue;
    if (!covered.has(u.id)) { uncovered++; continue; }
    // Runs saved before per-paragraph snapshots existed can't detect drift.
    if (u.id in reviewed && changedSubstantially(reviewed[u.id], u.target)) changed++;
  }

  const done = partsLeft === 0 && openIssues.length === 0 && changed === 0 && uncovered === 0;
  return {
    state: done ? 'complete' : 'incomplete',
    running: run.status === 'running',
    partsLeft,
    open: openIssues.length,
    critical: openIssues.filter((/** @type {any} */ i) => i.category === 'critical').length,
    changed,
    uncovered
  };
}

/** Persian tooltip line for a review state. @param {ReturnType<typeof reviewState>} s */
export function reviewStateLabel(s) {
  const fa = (/** @type {number} */ n) => n.toLocaleString('fa-IR');
  if (s.state === 'none') return 'بررسی کلی نشده';
  if (s.state === 'complete') return 'بررسی کلی کامل شده';
  if (s.running) return 'بررسی کلی در حال اجرا';
  const why = [];
  if (s.partsLeft) why.push(`${fa(s.partsLeft)} بخش بررسی‌نشده`);
  if (s.open) why.push(`${fa(s.open)} مورد بدون تأیید یا رد${s.critical ? ` (${fa(s.critical)} جدی)` : ''}`);
  if (s.changed) why.push(`${fa(s.changed)} بند پس از بررسی تغییر کرده`);
  if (s.uncovered) why.push(`${fa(s.uncovered)} بند جدید بررسی نشده`);
  return `بررسی کلی ناتمام: ${why.join('، ')}`;
}

export default { changedSubstantially, reviewState, reviewStateLabel };
