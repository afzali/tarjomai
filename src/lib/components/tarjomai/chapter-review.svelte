<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { reviewService } from '$lib/services/review.service.js';
  import { openrouterService } from '$lib/services/openrouter.service.js';
  import { getModelName } from '$lib/models.js';
  import { locateSpan } from '$lib/utils/text-fix.utils.js';
  import {
    REVIEW_CATEGORIES,
    PART_SIZES,
    resolvePromptConfig,
    planReviewParts,
    buildReviewSystemPrompt,
    buildReviewUserMessage,
    partText,
    parseReviewResponse,
    normalizeIssue,
    buildRewritePrompt
  } from '$lib/prompts/review.prompt.js';
  import ReviewIssueCard from './review-issue-card.svelte';

  /**
   * "بررسی کلی": structured whole-chapter review.
   * The chapter is split into parts (on paragraph boundaries) that are
   * reviewed one after another. Each finding carries an exact
   * { original → suggested } fix that the host page applies with one click.
   * applyFixes returns one undo token per fix (null = could not apply);
   * revertFixes takes tokens back (newest first) and restores those blocks.
   *
   * @typedef {{ id: string, source: string, target: string }} Unit
   * @typedef {{ blockId: string, original: string, suggested: string, target: string }} Fix
   */

  /** @type {{
   *   chapterId: number,
   *   projectId?: number|null,
   *   apiKey: string,
   *   model: string,
   *   ctx: import('$lib/prompts/review.prompt.js').ReviewContext,
   *   promptConfig: any,
   *   targetKey?: string,
   *   targetLabel?: string,
   *   applyFixes?: ((fixes: Fix[]) => Promise<any[]>) | null,
   *   revertFixes?: ((tokens: any[]) => Promise<boolean[]>) | null,
   *   onLocate?: ((blockId: string, opts?: { phrase?: string, source?: string, tone?: 'issue'|'applied', scroll?: boolean }) => void) | null,
   *   onAsk?: (text: string) => void,
   *   onOpenPrompt?: () => void,
   *   onPartSizeChange?: (key: string) => void,
   *   onRunChange?: (run: any) => void,
   *   openCount?: number,
   *   busy?: boolean
   * }} */
  let {
    chapterId,
    projectId = null,
    apiKey,
    model,
    ctx,
    promptConfig,
    targetKey = 'output',
    targetLabel = '',
    applyFixes = null,
    revertFixes = null,
    onLocate = null,
    onAsk = () => {},
    onOpenPrompt = () => {},
    onPartSizeChange = () => {},
    onRunChange = () => {},
    openCount = $bindable(0),
    busy = $bindable(false)
  } = $props();

  /** @type {any} */
  let run = $state(null);
  let loaded = $state(false);
  let running = $state(false);
  /** @type {AbortController | null} */
  let abort = null;

  /** @type {'all' | string} */
  let filter = $state('all');
  /** @type {'importance' | 'position'} */
  let sortMode = $state('importance');
  let showResolved = $state(false);
  /** @type {Record<string, boolean>} */
  let collapsed = $state({});
  /** @type {Set<string>} */
  let busyIds = $state(new Set());
  let confirmRestart = $state(false);
  let showSummaries = $state(false);

  const cfg = $derived(resolvePromptConfig(promptConfig));
  const partSize = $derived(PART_SIZES.find(p => p.key === cfg.partSize) || PART_SIZES[1]);
  const plan = $derived(planReviewParts(ctx.units, partSize.chars));
  const planChars = $derived(plan.reduce((a, p) => a + p.chars, 0));
  const planParagraphs = $derived(plan.reduce((a, p) => a + p.unitIdx.length, 0));

  /** Current position (1-based) and text of every unit, by block id. */
  const unitById = $derived(new Map(ctx.units.map((u, i) => [u.id, { ...u, n: i + 1 }])));

  // A review is tied to the layer it read (e.g. comparative vs fluent);
  // fixes can't be applied while another layer is on screen.
  const layerMismatch = $derived(!!(run?.targetKey && run.targetKey !== targetKey));
  const canApply = $derived(!!applyFixes && !layerMismatch);

  const issues = $derived(/** @type {any[]} */ (run?.issues || []));
  const openIssues = $derived(issues.filter(i => i.status === 'open'));
  const resolvedIssues = $derived(issues.filter(i => i.status !== 'open'));

  /** Whether an open issue's `original` can still be found in its paragraph. */
  const applicable = $derived.by(() => {
    /** @type {Map<string, boolean>} */
    const m = new Map();
    for (const i of openIssues) {
      const u = unitById.get(i.blockId);
      if (!u) { m.set(i.id, false); continue; }
      m.set(i.id, i.original?.trim() ? !!locateSpan(u.target, i.original) : !u.target.trim());
    }
    return m;
  });

  const catRank = Object.fromEntries(REVIEW_CATEGORIES.map((c, i) => [c.key, i]));
  /** @param {any} i */
  const para = (i) => unitById.get(i.blockId)?.n ?? i.paragraph ?? 0;

  /** @param {any[]} list */
  function sortIssues(list) {
    return [...list].sort((a, b) => sortMode === 'position'
      ? (para(a) - para(b)) || (catRank[a.category] - catRank[b.category])
      : (catRank[a.category] - catRank[b.category]) || (b.priority - a.priority) || (para(a) - para(b)));
  }

  const countsByCat = $derived(Object.fromEntries(
    REVIEW_CATEGORIES.map(c => [c.key, openIssues.filter(i => i.category === c.key).length])
  ));
  const visibleOpen = $derived(sortIssues(filter === 'all' ? openIssues : openIssues.filter(i => i.category === filter)));
  const groups = $derived(REVIEW_CATEGORIES
    .filter(c => filter === 'all' || filter === c.key)
    .map(c => ({ ...c, items: visibleOpen.filter(i => i.category === c.key) }))
    .filter(g => g.items.length > 0));
  const needsAI = $derived(visibleOpen.filter(i => !applicable.get(i.id)));

  const partsDone = $derived(run ? run.parts.filter((/** @type {any} */ p) => p.status === 'done').length : 0);
  const partsTotal = $derived(run ? run.parts.length : 0);
  const currentPart = $derived(run?.parts.find((/** @type {any} */ p) => p.status === 'running') || null);
  const pendingParts = $derived(run ? run.parts.filter((/** @type {any} */ p) => p.status !== 'done').length : 0);
  const summaries = $derived(run ? run.parts.filter((/** @type {any} */ p) => p.summary) : []);

  $effect(() => { openCount = openIssues.length; });
  $effect(() => { busy = running || busyIds.size > 0; });

  const fa = (/** @type {number} */ n) => n.toLocaleString('fa-IR');
  const uid = () => Math.random().toString(36).slice(2, 10);

  onMount(async () => {
    const saved = await reviewService.getLatestRun(chapterId);
    if (saved) {
      // A run interrupted mid-way (panel closed, page reloaded) can be resumed.
      for (const p of saved.parts) if (p.status === 'running') p.status = 'pending';
      if (saved.status === 'running') saved.status = 'stopped';
      run = saved;
    }
    loaded = true;
  });

  onDestroy(() => abort?.abort());

  async function persist() {
    if (!run) return;
    const saved = await reviewService.saveRun($state.snapshot(run));
    if (!run.id) run.id = saved.id;
    onRunChange(saved);
  }

  /**
   * Remember the paragraphs' current text as "reviewed". Called when a part
   * is reviewed and after fixes made through the review, so only changes
   * made elsewhere (re-translation, …) count as the text moving on.
   * @param {string[]} blockIds
   */
  async function markReviewed(blockIds) {
    await tick();
    if (!run.reviewed) run.reviewed = {};
    for (const id of blockIds) {
      const u = unitById.get(id);
      if (u) run.reviewed[id] = u.target;
    }
  }

  // ─── Running the review ────────────────────────────────────────────────

  async function startReview() {
    confirmRestart = false;
    if (running) return;
    if (!apiKey) { toast.error('ابتدا API Key را در تنظیمات وارد کنید'); return; }
    if (!plan.length) { toast.error('متنی برای بررسی در این فصل نیست'); return; }
    await reviewService.deleteRuns(chapterId);
    run = await reviewService.saveRun({
      chapterId,
      createdAt: new Date().toISOString(),
      model,
      operationType: ctx.operationType,
      targetKey,
      targetLabel,
      partSize: partSize.key,
      status: 'running',
      parts: plan.map(p => ({
        index: p.index,
        blockIds: p.unitIdx.map(i => ctx.units[i].id),
        from: p.from,
        to: p.to,
        chars: p.chars,
        status: 'pending',
        issueCount: 0,
        summary: '',
        error: '',
        truncated: false
      })),
      issues: []
    });
    filter = 'all';
    await processPending();
  }

  async function processPending() {
    if (!run || running) return;
    if (!apiKey) { toast.error('ابتدا API Key را در تنظیمات وارد کنید'); return; }
    running = true;
    abort = new AbortController();
    const signal = abort.signal;
    run.status = 'running';
    await persist();
    try {
      for (const part of run.parts) {
        if (signal.aborted) break;
        if (part.status === 'done') continue;
        await processPart(part, signal);
      }
    } finally {
      running = false;
      abort = null;
      if (run) {
        const stopped = signal.aborted;
        run.status = stopped ? 'stopped' : (run.parts.some((/** @type {any} */ p) => p.status !== 'done') ? 'partial' : 'done');
        await persist();
        if (!stopped && run.status === 'done') {
          const n = run.issues.filter((/** @type {any} */ i) => i.status === 'open').length;
          toast.success(n ? `بررسی کامل شد — ${fa(n)} مورد پیدا شد` : 'بررسی کامل شد — ایرادی پیدا نشد');
        }
      }
    }
  }

  /** Re-run a single failed part. @param {any} part */
  async function retryPart(part) {
    if (running) return;
    part.status = 'pending';
    await processPending();
  }

  function stopReview() { abort?.abort(); }

  /** @param {any} part @param {AbortSignal} signal */
  async function processPart(part, signal) {
    // Map stored block ids to current positions (blocks may have moved).
    const idxs = part.blockIds
      .map((/** @type {string} */ id) => ctx.units.findIndex(u => u.id === id))
      .filter((/** @type {number} */ i) => i !== -1);
    if (!idxs.length) { part.status = 'done'; part.issueCount = 0; return; }

    const p = { index: part.index, unitIdx: idxs, from: idxs[0] + 1, to: idxs[idxs.length - 1] + 1 };
    part.from = p.from;
    part.to = p.to;
    part.status = 'running';
    part.error = '';

    const system = buildReviewSystemPrompt(ctx, promptConfig, partText(ctx, p));
    const user = buildReviewUserMessage(ctx, p, run.parts.length);
    const result = await openrouterService.sendMessage(
      apiKey,
      run.model || model,
      [{ role: 'system', content: system }, { role: 'user', content: user }],
      { signal, projectId, chapterId, operationType: 'review', response_format: { type: 'json_object' } }
    );

    if (signal.aborted || result.cancelled) { part.status = 'pending'; return; }
    if (result.success === false) {
      part.status = 'error';
      part.error = result.error || 'خطا در دریافت پاسخ';
      await persist();
      return;
    }

    const parsed = parseReviewResponse(result.content || '');
    if (!parsed.ok) {
      part.status = 'error';
      part.error = result.truncated
        ? 'پاسخ مدل نیمه‌کاره ماند. اندازه‌ی بخش را کوچک‌تر کنید و دوباره بررسی کنید.'
        : 'پاسخ مدل قابل خواندن نبود.';
      await persist();
      return;
    }

    const found = [];
    for (const raw of parsed.issues) {
      const it = normalizeIssue(raw);
      if (!it) continue;
      let ui = it.paragraph - 1;
      if (!idxs.includes(ui)) {
        // Wrong paragraph number — find the paragraph that holds `original`.
        ui = it.original.trim()
          ? (idxs.find((/** @type {number} */ i) => locateSpan(ctx.units[i].target, it.original)) ?? -1)
          : (idxs.length === 1 ? idxs[0] : -1);
      }
      if (ui < 0) continue;
      found.push({ ...it, id: uid(), partIndex: part.index, blockId: ctx.units[ui].id, paragraph: ui + 1, status: 'open' });
    }
    run.issues.push(...found);
    await markReviewed(idxs.map((/** @type {number} */ i) => ctx.units[i].id));
    part.status = 'done';
    part.issueCount = found.length;
    part.summary = parsed.summary;
    part.truncated = !!(result.truncated || parsed.partial);
    await persist();
  }

  // ─── Applying / rejecting / undoing ───────────────────────────────────

  /** @param {any} issue */
  function fixOf(issue, suggested = issue.suggested) {
    return { blockId: issue.blockId, original: issue.original, suggested, target: run.targetKey || targetKey };
  }

  /** @param {string} text @param {string} sub */
  function occurrences(text, sub) {
    if (!sub) return 0;
    let n = 0, i = 0;
    while ((i = text.indexOf(sub, i)) !== -1) { n++; i += sub.length; }
    return n;
  }

  /** @param {any} issue @param {any} token @param {'auto'|'ai'} via @param {{ original: string, suggested: string }} undo */
  function markApplied(issue, token, via, undo) {
    issue.status = 'applied';
    issue.via = via;
    issue.token = token; // exact before/after snapshot of the block, for undo
    issue.undo = undo;   // fallback: reverse just this span
  }

  /** Issue last shown in the text; its mark turns green once it is applied. */
  let lastLocatedId = '';

  /** Scroll to the issue's paragraph and mark its phrase (or the applied text). @param {any} issue */
  function locateIssue(issue) {
    lastLocatedId = issue.id;
    const applied = issue.status === 'applied';
    onLocate?.(issue.blockId, {
      phrase: applied ? (issue.via === 'ai' ? '' : issue.suggested) : issue.original,
      source: issue.sourceExcerpt,
      tone: applied ? 'applied' : 'issue'
    });
  }

  /** After applying the issue the user is looking at, mark the new text in place. @param {any} issue */
  function remarkIfLocated(issue) {
    if (issue.id !== lastLocatedId || issue.via === 'ai') return;
    onLocate?.(issue.blockId, { phrase: issue.suggested, tone: 'applied', scroll: false });
  }

  /** @param {any} issue */
  function markOpen(issue) {
    issue.status = 'open';
    delete issue.via;
    delete issue.token;
    delete issue.undo;
  }

  /** @param {any} issue @param {string} [suggestedOverride] */
  async function applyIssue(issue, suggestedOverride) {
    if (!applyFixes || !canApply) return;
    if (suggestedOverride !== undefined && suggestedOverride !== issue.suggested) {
      issue.suggested = suggestedOverride;
      issue.edited = true;
    }
    const [token] = await applyFixes([fixOf(issue)]);
    if (!token) {
      toast.error('اعمال نشد؛ متن بند تغییر کرده است. «اصلاح با AI» را امتحان کنید.');
      return;
    }
    markApplied(issue, token, 'auto', { original: issue.suggested, suggested: issue.original });
    remarkIfLocated(issue);
    await markReviewed([issue.blockId]);
    await persist();
  }

  /** Ask the model to rewrite the paragraph with this one fix applied. @param {any} issue */
  async function applyWithAI(issue) {
    if (!applyFixes || !canApply || busyIds.has(issue.id)) return;
    const u = unitById.get(issue.blockId);
    if (!u) { toast.error('این بند دیگر در فصل وجود ندارد'); return; }
    if (!apiKey) { toast.error('ابتدا API Key را در تنظیمات وارد کنید'); return; }
    busyIds = new Set([...busyIds, issue.id]);
    try {
      const prompt = buildRewritePrompt(ctx, u, issue);
      const r = await openrouterService.sendMessage(
        apiKey,
        model,
        [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }],
        { projectId, chapterId, operationType: 'review', max_tokens: Math.min(8000, Math.max(1024, Math.ceil(u.target.length * 3) + 1500)) }
      );
      const text = (r.content || '').trim().replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
      if (r.success === false || r.truncated || !text) {
        toast.error(r.error || 'مدل پاسخ کاملی برنگرداند');
        return;
      }
      const before = u.target;
      const [token] = await applyFixes([{ blockId: issue.blockId, original: before, suggested: text, target: run.targetKey || targetKey }]);
      if (!token) { toast.error('اعمال نشد؛ متن بند در این فاصله تغییر کرد'); return; }
      markApplied(issue, token, 'ai', { original: text, suggested: before });
      await markReviewed([issue.blockId]);
      await persist();
    } finally {
      const next = new Set(busyIds);
      next.delete(issue.id);
      busyIds = next;
    }
  }

  /** @param {any} issue */
  async function rejectIssue(issue) {
    issue.status = 'rejected';
    await persist();
  }

  /**
   * Revert applied issues, in the given order (pass newest first). Restores
   * each block's exact snapshot when nothing changed it since; otherwise
   * reverses just the fix's span if it is still there. Returns success flags.
   * @param {any[]} list
   */
  async function revertIssues(list) {
    if (!applyFixes || !canApply) return list.map(() => false);
    const exact = revertFixes
      ? await revertFixes(list.map(i => i.token || null))
      : list.map(() => false);
    const target = run.targetKey || targetKey;
    const results = [];
    for (let k = 0; k < list.length; k++) {
      if (exact[k]) { results.push(true); continue; }
      const i = list[k];
      const cur = unitById.get(i.blockId)?.target ?? '';
      let ok = false;
      if (i.undo && (occurrences(cur, i.undo.original) === 1 || (!i.undo.original && !cur.trim()))) {
        const [token] = await applyFixes([{ blockId: i.blockId, ...i.undo, target }]);
        ok = !!token;
        if (ok) await tick();
      }
      results.push(ok);
    }
    return results;
  }

  /** @param {any} issue */
  async function undoIssue(issue) {
    if (issue.status === 'applied') {
      const [ok] = await revertIssues([issue]);
      if (!ok) {
        toast.error('بازگردانی خودکار ممکن نیست؛ متن بند پس از اعمال تغییر کرده است.');
        return;
      }
    }
    markOpen(issue);
    await markReviewed([issue.blockId]);
    await persist();
  }

  /** Apply every applicable open issue in `list` in one go (undo via toast). @param {any[]} list */
  async function applyMany(list) {
    if (!applyFixes || !canApply) return;
    // Longest spans first: when fixes overlap, a short span usually survives
    // inside a longer fix (e.g. an omission that appends to a sentence), but
    // not the other way round.
    const cands = list
      .filter(i => i.status === 'open' && applicable.get(i.id))
      .sort((a, b) => (b.original?.length || 0) - (a.original?.length || 0));
    const skipped = list.filter(i => i.status === 'open' && !applicable.get(i.id)).length;
    if (!cands.length) {
      if (skipped) toast.info(`${fa(skipped)} مورد فقط با «اصلاح با AI» قابل اعمال است`);
      return;
    }

    const tokens = await applyFixes(cands.map(i => fixOf(i)));
    /** @type {any[]} */
    const applied = [];
    cands.forEach((i, k) => {
      if (!tokens[k]) return;
      markApplied(i, tokens[k], 'auto', { original: i.suggested, suggested: i.original });
      applied.push(i);
    });
    await markReviewed(applied.map(i => i.blockId));
    await persist();

    const failed = cands.length - applied.length + skipped;
    toast.success(`${fa(applied.length)} اصلاح اعمال شد`, {
      description: failed ? `${fa(failed)} مورد نیاز به «اصلاح با AI» دارد` : undefined,
      action: { label: 'بازگردانی', onClick: () => undoBatch(applied) },
      duration: 8000
    });
  }

  /** Undo a bulk apply, newest first so each block steps back exactly. @param {any[]} applied */
  async function undoBatch(applied) {
    const live = applied.filter(i => i.status === 'applied').reverse();
    if (!live.length) return;
    const results = await revertIssues(live);
    live.forEach((i, k) => { if (results[k]) markOpen(i); });
    await markReviewed(live.map(i => i.blockId));
    await persist();
    const failed = results.filter(r => !r).length;
    if (failed) toast.error(`${fa(failed)} مورد قابل بازگردانی نبود`);
    else toast.success('بازگردانی شد');
  }

  /** @param {any[]} list */
  async function rejectMany(list) {
    const targets = list.filter(i => i.status === 'open');
    if (!targets.length) return;
    for (const i of targets) i.status = 'rejected';
    await persist();
    toast(`${fa(targets.length)} مورد رد شد`, {
      action: {
        label: 'بازگردانی',
        onClick: async () => {
          for (const i of targets) if (i.status === 'rejected') i.status = 'open';
          await persist();
        }
      },
      duration: 6000
    });
  }

  /** @param {any[]} list */
  async function applyManyWithAI(list) {
    for (const i of list) {
      if (i.status !== 'open') continue;
      await applyWithAI(i);
    }
  }

  /** @param {any} issue */
  function askAbout(issue) {
    const lines = [
      `درباره‌ی این مورد در بند ${para(issue)}:`,
      issue.explanation ? `> ${issue.explanation}` : '',
      issue.original ? `متن فعلی: «${issue.original}»` : '',
      `پیشنهاد: «${issue.suggested}»`,
      '',
      ''
    ];
    onAsk(lines.filter((l, k) => l || k >= lines.length - 2).join('\n'));
  }

  /** @param {string} key */
  function toggleCollapsed(key) {
    collapsed = { ...collapsed, [key]: !collapsed[key] };
  }

  /** @param {any} p */
  function partTitle(p) {
    const range = p.from === p.to ? `بند ${fa(p.from)}` : `بندهای ${fa(p.from)} تا ${fa(p.to)}`;
    const state = p.status === 'done' ? `${fa(p.issueCount)} مورد${p.truncated ? ' (پاسخ ناقص)' : ''}`
      : p.status === 'running' ? 'در حال بررسی'
      : p.status === 'error' ? `خطا: ${p.error} — کلیک برای تلاش دوباره`
      : 'در انتظار';
    return `بخش ${fa(p.index + 1)} · ${range} · ${state}`;
  }
</script>

<div class="flex flex-col h-full min-h-0">
  {#if !loaded}
    <div class="flex-1 flex items-center justify-center">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
    </div>

  {:else if !run || confirmRestart}
    <!-- ─── Start screen: what will happen ─── -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <div class="space-y-1.5">
        <div class="flex items-center gap-2">
          <span class="w-8 h-8 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center shrink-0">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </span>
          <h3 class="text-sm font-semibold">بررسی هوشمند فصل</h3>
        </div>
        <p class="text-xs text-muted-foreground leading-relaxed">
          کل فصل بند به بند با متن اصلی مقایسه می‌شود. ایرادها دسته‌بندی و از مهم به کم‌اهمیت مرتب می‌شوند و هر اصلاح با یک کلیک — یا همه با هم — اعمال می‌شود.
        </p>
      </div>

      <div class="rounded-lg border bg-muted/30 p-3 space-y-3">
        <div class="flex items-baseline justify-between gap-2">
          <span class="text-xs font-medium">برنامه‌ی بررسی</span>
          <span class="text-[11px] text-muted-foreground">{fa(planParagraphs)} بند · {fa(planChars)} نویسه</span>
        </div>

        {#if plan.length === 0}
          <p class="text-xs text-muted-foreground">این فصل متنی برای بررسی ندارد.</p>
        {:else}
          <p class="text-xs leading-relaxed">
            {#if plan.length === 1}
              کل متن در <span class="font-semibold">یک مرحله</span> بررسی می‌شود.
            {:else}
              کل متن به <span class="font-semibold text-primary">{fa(plan.length)} بخش</span> تقسیم می‌شود و بخش به بخش جلو می‌رود؛ نتیجه‌ی هر بخش همان لحظه نمایش داده می‌شود.
            {/if}
          </p>
          <div class="flex gap-0.5 h-2 rounded-full overflow-hidden" aria-hidden="true">
            {#each plan as p (p.index)}
              <div class="bg-primary/30 first:rounded-r-full last:rounded-l-full" style="flex: {Math.max(p.chars, 1)}" title="بخش {fa(p.index + 1)}: بندهای {fa(p.from)} تا {fa(p.to)}"></div>
            {/each}
          </div>
        {/if}

        <div class="space-y-1.5">
          <span class="text-[11px] text-muted-foreground">اندازه‌ی هر بخش</span>
          <div class="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-background border">
            {#each PART_SIZES as s (s.key)}
              <button
                onclick={() => onPartSizeChange(s.key)}
                class="text-[11px] py-1 rounded-md transition-colors {partSize.key === s.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}"
                title={s.hint}
              >{s.label}</button>
            {/each}
          </div>
          <p class="text-[10px] text-muted-foreground">{partSize.hint}</p>
        </div>

        <dl class="text-[11px] grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {#if targetLabel}
            <dt class="text-muted-foreground">متن بررسی</dt><dd>{targetLabel}</dd>
          {/if}
          <dt class="text-muted-foreground">مدل</dt><dd class="truncate" dir="auto">{getModelName(model)}</dd>
          <dt class="text-muted-foreground">ملاک‌ها</dt>
          <dd>
            {[cfg.includeRules && (ctx.rules || '').trim() ? 'قوانین پروژه' : '', cfg.includeGlossary ? 'واژه‌نامه' : ''].filter(Boolean).join(' + ') || 'فقط دستورالعمل'}
          </dd>
        </dl>
      </div>

      <div class="space-y-1.5">
        <span class="text-[11px] text-muted-foreground">دسته‌بندی ایرادها</span>
        <ul class="space-y-1">
          {#each REVIEW_CATEGORIES as c (c.key)}
            <li class="flex items-start gap-2 text-[11px]">
              <span class="w-2 h-2 rounded-full mt-1 shrink-0 {c.dot}"></span>
              <span><span class="font-medium">{c.label}</span> <span class="text-muted-foreground">— {c.hint}</span></span>
            </li>
          {/each}
        </ul>
      </div>

      <div class="flex items-center gap-2">
        <button
          onclick={startReview}
          disabled={!plan.length || !apiKey}
          class="flex-1 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors inline-flex items-center justify-center gap-1.5"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>
          {confirmRestart ? 'شروع بررسی تازه' : 'شروع بررسی'}
        </button>
        {#if confirmRestart}
          <button onclick={() => confirmRestart = false} class="h-9 px-3 rounded-md border border-input text-sm hover:bg-muted transition-colors">انصراف</button>
        {/if}
        <button onclick={onOpenPrompt} class="h-9 px-3 rounded-md border border-input text-xs hover:bg-muted transition-colors inline-flex items-center gap-1" title="دیدن و ویرایش پرامپت بررسی">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
          پرامپت
        </button>
      </div>
      {#if confirmRestart && openIssues.length}
        <p class="text-[11px] text-amber-700 dark:text-amber-300">{fa(openIssues.length)} مورد بررسی‌نشده از نتیجه‌ی قبلی پاک می‌شود. اصلاح‌های اعمال‌شده در متن می‌مانند.</p>
      {/if}
      {#if !apiKey}
        <p class="text-[11px] text-destructive">برای بررسی، API Key را در تنظیمات وارد کنید.</p>
      {/if}
    </div>

  {:else}
    <!-- ─── Progress ─── -->
    <div class="px-3 py-2.5 border-b space-y-2 shrink-0 bg-muted/20">
      <div class="flex items-center gap-2">
        <div class="flex-1 min-w-0 text-xs">
          {#if running}
            <span class="inline-flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 animate-spin text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              {#if partsTotal > 1}
                بخش {fa((currentPart?.index ?? partsDone) + 1)} از {fa(partsTotal)} در حال بررسی…
              {:else}
                در حال بررسی فصل…
              {/if}
            </span>
          {:else if run.status === 'done'}
            <span class="text-foreground">بررسی کامل شد</span>
            <span class="text-muted-foreground">· {partsTotal > 1 ? `${fa(partsTotal)} بخش · ` : ''}{fa(issues.length)} مورد</span>
          {:else}
            <span class="text-amber-700 dark:text-amber-300">{run.status === 'stopped' ? 'متوقف شد' : 'ناتمام'}</span>
            <span class="text-muted-foreground">· {fa(partsDone)} از {fa(partsTotal)} بخش</span>
          {/if}
        </div>
        {#if running}
          <button onclick={stopReview} class="h-6 px-2 rounded text-[11px] border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">توقف</button>
        {:else}
          {#if pendingParts > 0}
            <button onclick={processPending} class="h-6 px-2 rounded text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">ادامه</button>
          {/if}
          <button onclick={() => confirmRestart = true} class="h-6 px-2 rounded text-[11px] border border-input hover:bg-muted transition-colors" title="بررسی دوباره‌ی کل فصل">بررسی تازه</button>
        {/if}
      </div>

      {#if partsTotal > 1 || run.status !== 'done'}
        <!-- One segment per part, width proportional to its size -->
        <div class="flex gap-0.5 h-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={partsTotal} aria-valuenow={partsDone}>
          {#each run.parts as p (p.index)}
            <button
              onclick={() => p.status === 'error' && retryPart(p)}
              class="h-full rounded-full transition-colors
                {p.status === 'done' ? 'bg-green-500/80' : p.status === 'running' ? 'bg-primary animate-pulse' : p.status === 'error' ? 'bg-red-500 cursor-pointer' : 'bg-muted-foreground/20'}
                {p.status === 'error' ? '' : 'cursor-default'}"
              style="flex: {Math.max(p.chars, 1)}"
              title={partTitle(p)}
              aria-label={partTitle(p)}
            ></button>
          {/each}
        </div>
        {#if partsTotal > 1}
          <div class="flex flex-wrap gap-1">
            {#each run.parts as p (p.index)}
              <button
                onclick={() => p.status === 'error' && retryPart(p)}
                title={partTitle(p)}
                class="text-[10px] px-1.5 py-0.5 rounded-full border inline-flex items-center gap-1 transition-colors
                  {p.status === 'done' ? 'border-green-500/30 text-green-700 dark:text-green-400' : p.status === 'running' ? 'border-primary/40 text-primary' : p.status === 'error' ? 'border-red-400/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30' : 'border-border text-muted-foreground'}"
              >
                بخش {fa(p.index + 1)}
                {#if p.status === 'done'}
                  <span class="opacity-75">· {fa(p.issueCount)} مورد</span>
                {:else if p.status === 'running'}
                  <svg class="w-2.5 h-2.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                {:else if p.status === 'error'}
                  <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      {/if}

      {#if layerMismatch}
        <p class="text-[11px] rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 px-2 py-1">
          این بررسی روی «{run.targetLabel || 'لایه‌ی دیگر'}» انجام شده است؛ برای اعمال اصلاح‌ها همان نما را در ستون ترجمه انتخاب کنید.
        </p>
      {/if}
      {#each run.parts.filter((/** @type {any} */ p) => p.status === 'error') as p (p.index)}
        <p class="text-[11px] text-destructive">بخش {fa(p.index + 1)}: {p.error}</p>
      {/each}
      {#if run.parts.some((/** @type {any} */ p) => p.truncated)}
        <p class="text-[11px] text-amber-700 dark:text-amber-300">پاسخ بعضی بخش‌ها به سقف طول رسید و ممکن است کامل نباشد؛ برای بررسی دقیق‌تر اندازه‌ی بخش را «کوچک» کنید.</p>
      {/if}
    </div>

    <!-- ─── Category filter + bulk actions ─── -->
    {#if issues.length > 0}
      <div class="px-3 pt-2 pb-2 border-b space-y-2 shrink-0">
        <div class="flex flex-wrap gap-1" role="tablist">
          <button
            role="tab" aria-selected={filter === 'all'}
            onclick={() => filter = 'all'}
            class="shrink-0 text-[11px] h-6 px-2 rounded-full border transition-colors {filter === 'all' ? 'bg-foreground text-background border-foreground' : 'text-muted-foreground hover:bg-muted'}"
          >همه {fa(openIssues.length)}</button>
          {#each REVIEW_CATEGORIES as c (c.key)}
            <button
              role="tab" aria-selected={filter === c.key}
              onclick={() => filter = filter === c.key ? 'all' : c.key}
              disabled={!countsByCat[c.key] && filter !== c.key}
              class="shrink-0 text-[11px] h-6 px-2 rounded-full border inline-flex items-center gap-1 transition-colors disabled:opacity-40
                {filter === c.key ? `${c.soft} ${c.text} ${c.border}` : 'text-muted-foreground hover:bg-muted'}"
              title={c.hint}
            >
              <span class="w-1.5 h-1.5 rounded-full {c.dot}"></span>
              {c.label} {fa(countsByCat[c.key])}
            </button>
          {/each}
        </div>

        <div class="flex items-center gap-1.5">
          <button
            onclick={() => applyMany(visibleOpen)}
            disabled={!visibleOpen.length || !canApply}
            class="h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 disabled:opacity-40 transition-colors inline-flex items-center gap-1"
            title={filter === 'all' ? 'اعمال همه‌ی موارد باز' : 'اعمال همه‌ی موارد این دسته'}
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
            {filter === 'all' ? 'اعمال همه' : 'اعمال این دسته'}
            {#if visibleOpen.length}<span class="opacity-75">({fa(visibleOpen.length - needsAI.length)})</span>{/if}
          </button>
          <button
            onclick={() => rejectMany(visibleOpen)}
            disabled={!visibleOpen.length}
            class="h-7 px-2.5 rounded-md border border-input text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
          >{filter === 'all' ? 'رد همه' : 'رد این دسته'}</button>
          <span class="flex-1"></span>
          <div class="inline-flex rounded-md border border-input overflow-hidden text-[10px]" title="ترتیب نمایش">
            <button onclick={() => sortMode = 'importance'} class="px-1.5 h-6 transition-colors {sortMode === 'importance' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'}">اهمیت</button>
            <button onclick={() => sortMode = 'position'} class="px-1.5 h-6 border-r border-input transition-colors {sortMode === 'position' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'}">ترتیب متن</button>
          </div>
        </div>

        {#if needsAI.length > 0}
          <div class="flex items-center gap-2 text-[11px] rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-2 py-1">
            <span class="flex-1 text-amber-800 dark:text-amber-300">{fa(needsAI.length)} مورد را باید با AI روی متن فعلی بند اعمال کرد.</span>
            <button onclick={() => applyManyWithAI(needsAI)} disabled={busyIds.size > 0 || !canApply}
              class="shrink-0 px-2 py-0.5 rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors">اصلاح همه با AI</button>
          </div>
        {/if}
      </div>
    {/if}

    <!-- ─── Issue list ─── -->
    <div class="flex-1 overflow-y-auto min-h-0 p-3 space-y-3">
      {#if visibleOpen.length === 0}
        {#if running}
          <div class="space-y-2" aria-hidden="true">
            {#each [0, 1, 2] as k (k)}
              <div class="rounded-lg border p-2.5 space-y-2 animate-pulse">
                <div class="h-3 w-16 bg-muted rounded"></div>
                <div class="h-3 w-4/5 bg-muted rounded"></div>
                <div class="h-8 bg-muted/60 rounded"></div>
              </div>
            {/each}
            <p class="text-[11px] text-muted-foreground text-center">نتیجه‌ی هر بخش به‌محض آماده شدن اینجا می‌آید.</p>
          </div>
        {:else if issues.length === 0 && run.status === 'done'}
          <div class="text-center py-8 space-y-1.5">
            <div class="w-10 h-10 mx-auto rounded-full bg-green-100 dark:bg-green-950/40 text-green-600 inline-flex items-center justify-center">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <p class="text-sm font-medium">ایرادی پیدا نشد</p>
            <p class="text-xs text-muted-foreground">ترجمه‌ی این فصل از نظر مدل سالم است.</p>
          </div>
        {:else if issues.length > 0}
          <div class="text-center py-6 space-y-1">
            <p class="text-sm font-medium">{filter === 'all' ? 'همه‌ی موارد رسیدگی شد' : 'در این دسته مورد بازی نمانده'}</p>
            <p class="text-xs text-muted-foreground">{fa(issues.filter(i => i.status === 'applied').length)} اعمال‌شده · {fa(issues.filter(i => i.status === 'rejected').length)} ردشده</p>
          </div>
        {/if}
      {:else if sortMode === 'importance'}
        {#each groups as g (g.key)}
          <section class="space-y-1.5">
            <div class="flex items-center gap-1.5 sticky -top-3 z-10 bg-card py-1">
              <button onclick={() => toggleCollapsed(g.key)} class="flex items-center gap-1.5 min-w-0 flex-1 text-right" aria-expanded={!collapsed[g.key]}>
                <svg class="w-3 h-3 text-muted-foreground transition-transform shrink-0 {collapsed[g.key] ? 'rotate-90' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                <span class="w-2 h-2 rounded-full shrink-0 {g.dot}"></span>
                <span class="text-xs font-semibold {g.text}">{g.label}</span>
                <span class="text-[11px] text-muted-foreground">{fa(g.items.length)}</span>
              </button>
              {#if filter === 'all'}
                <button onclick={() => applyMany(g.items)} disabled={!canApply}
                  class="text-[10px] px-1.5 py-0.5 rounded text-primary hover:bg-primary/10 disabled:opacity-40 transition-colors"
                  title="اعمال همه‌ی موارد «{g.label}»">اعمال همه</button>
                <button onclick={() => rejectMany(g.items)}
                  class="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground hover:bg-muted transition-colors"
                  title="رد همه‌ی موارد «{g.label}»">رد همه</button>
              {/if}
            </div>
            {#if !collapsed[g.key]}
              {#each g.items as issue (issue.id)}
                <ReviewIssueCard
                  {issue}
                  paragraph={para(issue)}
                  applicable={!!applicable.get(issue.id)}
                  disabled={!canApply}
                  busy={busyIds.has(issue.id)}
                  onApply={(s) => applyIssue(issue, s)}
                  onApplyAI={() => applyWithAI(issue)}
                  onReject={() => rejectIssue(issue)}
                  onUndo={() => undoIssue(issue)}
                  onLocate={() => locateIssue(issue)}
                  onAsk={() => askAbout(issue)}
                />
              {/each}
            {/if}
          </section>
        {/each}
      {:else}
        <div class="space-y-1.5">
          {#each visibleOpen as issue (issue.id)}
            <ReviewIssueCard
              {issue}
              paragraph={para(issue)}
              showCategory
              applicable={!!applicable.get(issue.id)}
              disabled={!canApply}
              busy={busyIds.has(issue.id)}
              onApply={(s) => applyIssue(issue, s)}
              onApplyAI={() => applyWithAI(issue)}
              onReject={() => rejectIssue(issue)}
              onUndo={() => undoIssue(issue)}
              onLocate={() => locateIssue(issue)}
              onAsk={() => askAbout(issue)}
            />
          {/each}
        </div>
      {/if}

      {#if running && visibleOpen.length > 0}
        <p class="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5 py-1">
          <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          بخش‌های بعدی در راه است…
        </p>
      {/if}

      {#if summaries.length > 0}
        <div class="border-t pt-2">
          <button onclick={() => showSummaries = !showSummaries} class="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <svg class="w-3 h-3 transition-transform {showSummaries ? '' : 'rotate-90'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
            جمع‌بندی مدل
          </button>
          {#if showSummaries}
            <ul class="mt-1.5 space-y-1">
              {#each summaries as p (p.index)}
                <li class="text-[11px] leading-relaxed">
                  {#if partsTotal > 1}<span class="text-muted-foreground">بخش {fa(p.index + 1)}:</span>{/if}
                  {p.summary}
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}

      {#if resolvedIssues.length > 0}
        <div class="border-t pt-2">
          <button onclick={() => showResolved = !showResolved} class="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <svg class="w-3 h-3 transition-transform {showResolved ? '' : 'rotate-90'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
            رسیدگی‌شده‌ها ({fa(resolvedIssues.length)})
          </button>
          {#if showResolved}
            <div class="mt-1.5 space-y-1">
              {#each sortIssues(resolvedIssues) as issue (issue.id)}
                <ReviewIssueCard
                  {issue}
                  paragraph={para(issue)}
                  applicable={false}
                  onApply={() => {}}
                  onApplyAI={() => {}}
                  onReject={() => {}}
                  onUndo={() => undoIssue(issue)}
                  onLocate={() => locateIssue(issue)}
                  onAsk={() => askAbout(issue)}
                />
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>
