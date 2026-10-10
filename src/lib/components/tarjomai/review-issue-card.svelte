<script>
  import { REVIEW_CATEGORIES, ISSUE_TYPES } from '$lib/prompts/review.prompt.js';
  import { wordDiff } from '$lib/utils/text-fix.utils.js';

  /**
   * One review finding with its one-click fix.
   * @typedef {{
   *   id: string, category: string, type: string, priority: number,
   *   explanation: string, sourceExcerpt: string, original: string, suggested: string,
   *   status: 'open'|'applied'|'rejected', via?: 'auto'|'ai', edited?: boolean
   * }} Issue
   */

  /** @type {{
   *   issue: Issue,
   *   paragraph: number,
   *   applicable: boolean,
   *   disabled?: boolean,
   *   busy?: boolean,
   *   showCategory?: boolean,
   *   onApply: (suggested?: string) => void,
   *   onApplyAI: () => void,
   *   onReject: () => void,
   *   onUndo: () => void,
   *   onLocate: () => void,
   *   onAsk: () => void
   * }} */
  let {
    issue,
    paragraph,
    applicable,
    disabled = false,
    busy = false,
    showCategory = false,
    onApply,
    onApplyAI,
    onReject,
    onUndo,
    onLocate,
    onAsk
  } = $props();

  let editing = $state(false);
  let editValue = $state('');
  let showSource = $state(false);

  const cat = $derived(REVIEW_CATEGORIES.find(c => c.key === issue.category) || REVIEW_CATEGORIES[3]);
  const typeLabel = $derived(ISSUE_TYPES[issue.type]?.label || 'سایر');
  const diff = $derived(issue.original ? wordDiff(issue.original, issue.suggested) : []);
  const fa = (/** @type {number} */ n) => n.toLocaleString('fa-IR');

  function startEdit() {
    editValue = issue.suggested;
    editing = true;
  }

  function applyEdited() {
    editing = false;
    onApply(editValue);
  }
</script>

{#if issue.status === 'open'}
  <div class="rounded-lg border bg-background shadow-xs transition-colors hover:border-foreground/20 {busy ? 'opacity-60 pointer-events-none' : ''}">
    <!-- Meta row -->
    <div class="flex items-center gap-1.5 px-2.5 pt-2">
      {#if showCategory}
        <span class="w-1.5 h-1.5 rounded-full shrink-0 {cat.dot}" title={cat.label}></span>
      {/if}
      <span class="text-[10px] font-medium px-1.5 py-0.5 rounded {cat.soft} {cat.text}">{typeLabel}</span>
      <span class="inline-flex items-end gap-px h-2.5" title="اولویت: {issue.priority === 3 ? 'بالا' : issue.priority === 2 ? 'متوسط' : 'کم'}" aria-label="اولویت {issue.priority}">
        {#each [1, 2, 3] as lvl}
          <span class="w-[3px] rounded-sm {lvl <= issue.priority ? cat.dot : 'bg-muted-foreground/20'}" style="height: {lvl * 33}%"></span>
        {/each}
      </span>
      {#if issue.edited}
        <span class="text-[10px] text-muted-foreground">· ویرایش‌شده</span>
      {/if}
      <span class="flex-1"></span>
      <button
        onclick={onLocate}
        class="text-[10px] text-muted-foreground hover:text-primary inline-flex items-center gap-0.5 rounded px-1 py-0.5 hover:bg-muted transition-colors"
        title="نمایش این بند در متن"
      >
        بند {fa(paragraph)}
        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/></svg>
      </button>
    </div>

    <div class="px-2.5 pt-1.5 pb-2 space-y-1.5">
      {#if issue.explanation}
        <p class="text-xs leading-relaxed text-foreground/90">{issue.explanation}</p>
      {/if}

      {#if issue.sourceExcerpt}
        <button
          onclick={() => showSource = !showSource}
          class="block w-full text-right text-[11px] leading-relaxed text-muted-foreground border-r-2 border-muted-foreground/25 pr-2 hover:text-foreground transition-colors {showSource ? '' : 'line-clamp-1'}"
          dir="auto"
          title="متن اصلی مربوط"
        >{issue.sourceExcerpt}</button>
      {/if}

      <!-- Fix preview -->
      {#if editing}
        <textarea
          bind:value={editValue}
          rows={3}
          dir="auto"
          class="w-full text-[13px] leading-relaxed p-2 rounded-md border border-primary/40 bg-background resize-y focus:outline-none focus:ring-1 focus:ring-ring"
        ></textarea>
        <div class="flex items-center gap-1.5">
          <button onclick={applyEdited} disabled={!editValue.trim() && !issue.original}
            class="h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 disabled:opacity-40 transition-colors">اعمال این متن</button>
          <button onclick={() => editing = false}
            class="h-7 px-2.5 rounded-md border border-input text-xs hover:bg-muted transition-colors">لغو</button>
        </div>
      {:else}
        <div class="text-[13px] leading-relaxed rounded-md bg-muted/40 px-2 py-1.5 whitespace-pre-wrap break-words" dir="auto">
          {#if !issue.original}
            <span class="bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300 rounded px-0.5">{issue.suggested}</span>
          {:else}
            {#each diff as seg, i (i)}
              {#if seg.type === 'equal'}<span>{seg.text}</span>
              {:else if seg.type === 'insert'}<span class="bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300 rounded px-0.5">{seg.text}</span>
              {:else}<span class="bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 line-through decoration-red-400/70 rounded px-0.5">{seg.text}</span>
              {/if}
            {/each}
          {/if}
        </div>
      {/if}

      {#if !applicable && !editing && !disabled}
        <p class="text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-1">
          <svg class="w-3 h-3 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>
          متن موردنظر در بند پیدا نشد (احتمالاً تغییر کرده). با «اصلاح با AI» همین اصلاح روی متن فعلی بند اعمال می‌شود.
        </p>
      {/if}

      <!-- Actions -->
      {#if !editing && !disabled}
        <div class="flex items-center gap-1 pt-0.5">
          {#if applicable}
            <button onclick={() => onApply()}
              class="h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors inline-flex items-center gap-1">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
              اعمال
            </button>
          {:else}
            <button onclick={onApplyAI}
              class="h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors inline-flex items-center gap-1">
              {#if busy}
                <svg class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              {:else}
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
              {/if}
              اصلاح با AI
            </button>
          {/if}
          <button onclick={onReject}
            class="h-7 px-2.5 rounded-md border border-input text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            رد
          </button>
          <span class="flex-1"></span>
          <button onclick={startEdit}
            class="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="ویرایش پیشنهاد پیش از اعمال" aria-label="ویرایش پیشنهاد">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          </button>
          <button onclick={onAsk}
            class="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="پرسیدن درباره‌ی این مورد در گفتگو" aria-label="پرسیدن در گفتگو">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      {/if}
    </div>
  </div>
{:else}
  <!-- Resolved (applied / rejected): compact row with undo -->
  <div class="flex items-center gap-2 rounded-md border border-dashed px-2 py-1.5 text-[11px] text-muted-foreground">
    {#if issue.status === 'applied'}
      <svg class="w-3.5 h-3.5 text-green-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
      <span class="shrink-0">{issue.via === 'ai' ? 'اعمال با AI' : 'اعمال شد'}</span>
    {:else}
      <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      <span class="shrink-0">رد شد</span>
    {/if}
    <span class="shrink-0">· {typeLabel} · بند {fa(paragraph)}</span>
    <span class="truncate flex-1" dir="auto" title={issue.suggested}>{issue.suggested}</span>
    <button onclick={onUndo} class="shrink-0 text-[11px] px-1.5 py-0.5 rounded hover:bg-muted hover:text-foreground transition-colors">بازگردانی</button>
  </div>
{/if}
