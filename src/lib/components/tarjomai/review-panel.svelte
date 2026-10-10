<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { reviewService } from '$lib/services/review.service.js';
  import { openrouterService } from '$lib/services/openrouter.service.js';
  import projectsService from '$lib/services/projects.service.js';
  import { allModels, getModelName } from '$lib/models.js';
  import { fetchModels } from '$lib/stores/models.store.js';
  import { buildGlossaryPromptSection, filterGlossaryForText } from '$lib/utils/glossary.utils.js';
  import { buildChatSystemPrompt, estimateTokens, resolvePromptConfig } from '$lib/prompts/review.prompt.js';
  import { marked } from 'marked';
  import ChapterReview from './chapter-review.svelte';
  import ReviewPromptDialog from './review-prompt-dialog.svelte';

  /**
   * Side panel with two tabs:
   *  - گفتگو: free chat about the chapter. The model sees the whole chapter
   *    numbered by paragraph, plus project rules and relevant glossary.
   *  - بررسی کلی: structured review with one-click fixes (ChapterReview).
   *
   * @typedef {{ id: string, source: string, target: string }} Unit
   * @typedef {{ blockId: string, original: string, suggested: string, target: string }} Fix
   *
   * @typedef {Object} ReviewPanelProps
   * @property {number} chapterId
   * @property {number|null} [projectId]
   * @property {'translation'|'editorial'} [operationType]
   * @property {Unit[]} [units] - the chapter, paragraph by paragraph (source + current output)
   * @property {string} [apiKey]
   * @property {string} [defaultModel]
   * @property {string} [reviewRules] - project rules/style used as review criteria
   * @property {Array<{source:string,target:string,note?:string}>} [glossary]
   * @property {string} [sourceLanguage]
   * @property {string} [targetLanguage]
   * @property {string} [targetKey] - which output layer the units come from (passed back in fixes)
   * @property {string} [targetLabel] - human label of that layer
   * @property {((fixes: Fix[]) => Promise<any[]>) | null} [applyFixes] - returns an undo token per fix (null = not applied)
   * @property {((tokens: any[]) => Promise<boolean[]>) | null} [revertFixes] - restores blocks from undo tokens
   * @property {((blockId: string, opts?: { phrase?: string, source?: string, tone?: 'issue'|'applied', scroll?: boolean }) => void) | null} [onLocate] - scroll to a block and mark a phrase in it
   * @property {(run: any) => void} [onRunChange] - the chapter's review run was saved (for status in the chapter list)
   * @property {string} [quote] - pre-filled quote text for the chat input
   * @property {(() => void) | null} [onClose]
   */

  /** @type {ReviewPanelProps} */
  let {
    chapterId,
    projectId = null,
    operationType = 'translation',
    units = [],
    apiKey = '',
    defaultModel = 'google/gemini-3.5-flash',
    reviewRules = '',
    glossary = [],
    sourceLanguage = '',
    targetLanguage = '',
    targetKey = 'output',
    targetLabel = '',
    applyFixes = null,
    revertFixes = null,
    onLocate = null,
    onRunChange = () => {},
    quote = $bindable(''),
    onClose = null
  } = $props();

  const TAB_KEY = 'tarjomai.reviewPanelTab';
  const WIDTH_KEY = 'tarjomai.reviewPanelWidth';
  const MAX_HISTORY = 24;

  /** @type {'chat'|'review'} */
  let tab = $state('chat');
  let width = $state(400);

  // Chat
  /** @type {any[]} */
  let messages = $state([]);
  let input = $state('');
  let sending = $state(false);
  let streamText = $state('');
  /** @type {AbortController | null} */
  let chatAbort = null;
  /** @type {HTMLElement | null} */
  let chatEl = $state(null);
  /** @type {HTMLTextAreaElement | null} */
  let inputEl = $state(null);

  // Model
  let model = $state(defaultModel);
  let availableModels = $state(allModels);
  let modelSearch = $state('');
  let showModelDropdown = $state(false);

  // Prompts (persisted per project)
  /** @type {any} */
  let promptConfig = $state({});
  let showPromptDialog = $state(false);
  /** @type {'chat'|'review'} */
  let promptDialogTab = $state('chat');

  // Review tab status (bound from ChapterReview)
  let reviewOpenCount = $state(0);
  let reviewBusy = $state(false);

  const cfg = $derived(resolvePromptConfig(promptConfig));

  /** @type {import('$lib/prompts/review.prompt.js').ReviewContext} */
  const ctx = $derived({
    operationType,
    sourceLanguage,
    targetLanguage,
    rules: reviewRules,
    glossarySection: (/** @type {string} */ text) =>
      glossary?.length ? buildGlossaryPromptSection(filterGlossaryForText(glossary, text)) : '',
    units
  });

  const chatSystemPrompt = $derived(buildChatSystemPrompt(ctx, promptConfig));
  const chatTokens = $derived(estimateTokens(chatSystemPrompt));
  const paragraphCount = $derived(units.filter(u => u.source?.trim() || u.target?.trim()).length);
  const glossaryHits = $derived(
    cfg.includeGlossary && glossary?.length
      ? filterGlossaryForText(glossary, units.map(u => `${u.source}\n${u.target}`).join('\n')).length
      : 0
  );
  const hasRules = $derived(cfg.includeRules && !!(reviewRules || '').trim());

  const modelLabel = $derived(availableModels.find(m => m.id === model)?.name || getModelName(model) || model);
  const filteredModels = $derived(
    modelSearch.trim()
      ? availableModels.filter(m =>
          m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
          m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
          (m.provider || '').toLowerCase().includes(modelSearch.toLowerCase())
        )
      : availableModels
  );

  const suggestions = $derived(operationType === 'editorial'
    ? ['مهم‌ترین تغییرات ویرایشی این فصل را خلاصه کن', 'کجا معنا در ویرایش تغییر کرده؟', 'ناهماهنگی‌های رسم‌الخط و نیم‌فاصله را فهرست کن']
    : ['جمله‌ها یا عبارت‌های جاافتاده را پیدا کن', 'اصطلاحاتی که یکدست ترجمه نشده‌اند را فهرست کن', 'کدام بندها ترجمه‌ی ضعیف‌تری دارند و چرا؟', 'لحن ترجمه با متن اصلی هماهنگ است؟']);

  const fa = (/** @type {number} */ n) => n.toLocaleString('fa-IR');
  const compact = (/** @type {number} */ n) => n >= 1000 ? `${(n / 1000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} هزار` : fa(n);

  onMount(async () => {
    try {
      const t = localStorage.getItem(TAB_KEY);
      if (t === 'chat' || t === 'review') tab = t;
      const w = parseInt(localStorage.getItem(WIDTH_KEY) || '', 10);
      if (w) width = clampWidth(w);
    } catch { /* storage unavailable */ }

    messages = await reviewService.getMessages(chapterId);
    await scrollToBottom(true);
    if (projectId) {
      const p = await projectsService.getProject(projectId);
      promptConfig = p?.reviewPromptConfig || {};
    }
    if (apiKey) fetchModels(apiKey).then(m => { availableModels = m; });
  });

  onDestroy(() => chatAbort?.abort());

  $effect(() => {
    if (quote) {
      input = quote;
      quote = '';
      setTab('chat');
      tick().then(() => { inputEl?.focus(); autoGrow(); });
    }
  });

  $effect(() => {
    if (defaultModel) model = defaultModel;
  });

  /** @param {'chat'|'review'} t */
  function setTab(t) {
    tab = t;
    try { localStorage.setItem(TAB_KEY, t); } catch { /* ignore */ }
  }

  // ─── Resizable width ───
  function clampWidth(/** @type {number} */ w) {
    return Math.max(320, Math.min(760, Math.round(w)));
  }

  /** The panel sits at the left edge; its handle is on its right edge. @param {PointerEvent} e */
  function startResize(e) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const move = (/** @type {PointerEvent} */ ev) => { width = clampWidth(startW + (ev.clientX - startX)); };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try { localStorage.setItem(WIDTH_KEY, String(width)); } catch { /* ignore */ }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  // ─── Prompt config ───
  /** @param {any} next */
  async function savePromptConfig(next) {
    promptConfig = next;
    if (projectId) await projectsService.updateProject(projectId, { reviewPromptConfig: next });
  }

  /** @param {'chat'|'review'} which */
  function openPrompt(which) {
    promptDialogTab = which;
    showPromptDialog = true;
  }

  function toggleChatContext() {
    savePromptConfig({ ...promptConfig, chatContext: cfg.chatContext === 'full' ? 'none' : 'full' });
  }

  // ─── Chat ───
  async function scrollToBottom(force = false) {
    await tick();
    if (!chatEl) return;
    const nearBottom = chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight < 120;
    if (force || nearBottom) chatEl.scrollTo({ top: chatEl.scrollHeight });
  }

  function autoGrow() {
    if (!inputEl) return;
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px';
  }

  /** History sent to the model: no error bubbles, capped, starting with a user turn. */
  function buildHistory() {
    const h = messages
      .filter(m => !m.isError && m.content?.trim())
      .map(m => ({ role: m.role, content: m.content }))
      .slice(-MAX_HISTORY);
    while (h.length && h[0].role !== 'user') h.shift();
    return h;
  }

  /** @param {string} [text] */
  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || sending || !chapterId) return;
    if (!apiKey) { toast.error('ابتدا API Key را در تنظیمات وارد کنید'); return; }
    input = '';
    await tick();
    autoGrow();
    await reviewService.addMessage(chapterId, 'user', content);
    messages = await reviewService.getMessages(chapterId);
    await complete();
  }

  async function complete() {
    sending = true;
    streamText = '';
    chatAbort = new AbortController();
    await scrollToBottom(true);
    const usedModel = model;
    try {
      const result = await openrouterService.streamMessage(
        apiKey,
        usedModel,
        [{ role: 'system', content: chatSystemPrompt }, ...buildHistory()],
        {
          signal: chatAbort.signal,
          projectId,
          chapterId,
          operationType: 'chat',
          temperature: 0.4,
          seed: Math.floor(Math.random() * 1e9)
        },
        (/** @type {string} */ _delta, /** @type {string} */ full) => { streamText = full; scrollToBottom(); }
      );
      const partial = (result.content || '').trim();
      if (result.success) {
        await reviewService.addMessage(chapterId, 'assistant', partial || '(پاسخ خالی بود)', usedModel, {
          usage: result.usage || null,
          stopped: !!result.truncated
        });
      } else if (result.cancelled) {
        if (partial) await reviewService.addMessage(chapterId, 'assistant', partial, usedModel, { stopped: true });
      } else {
        if (partial) await reviewService.addMessage(chapterId, 'assistant', partial, usedModel, { stopped: true });
        await reviewService.addMessage(chapterId, 'assistant', result.error || 'خطا در دریافت پاسخ', usedModel, { isError: true });
      }
    } finally {
      streamText = '';
      sending = false;
      chatAbort = null;
      messages = await reviewService.getMessages(chapterId);
      await scrollToBottom();
    }
  }

  function stopChat() { chatAbort?.abort(); }

  async function regenerate() {
    if (sending) return;
    // Drop the trailing assistant replies (incl. errors) and ask again.
    const lastUser = messages.map(m => m.role).lastIndexOf('user');
    if (lastUser === -1) return;
    for (const m of messages.slice(lastUser + 1)) await reviewService.deleteMessage(m.id);
    messages = await reviewService.getMessages(chapterId);
    await complete();
  }

  /** @param {any} msg */
  async function deleteMessage(msg) {
    await reviewService.deleteMessage(msg.id);
    messages = await reviewService.getMessages(chapterId);
  }

  /** @param {string} text */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('کپی شد');
    } catch {
      toast.error('کپی ممکن نشد');
    }
  }

  async function clearChat() {
    await reviewService.clearMessages(chapterId);
    messages = [];
  }

  /** @param {KeyboardEvent} e */
  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      send();
    }
  }

  /** From the review tab: discuss an issue in chat. @param {string} text */
  function askInChat(text) {
    input = text;
    setTab('chat');
    tick().then(() => { inputEl?.focus(); autoGrow(); });
  }

  /** @param {any} usage */
  function usageLabel(usage) {
    if (!usage) return '';
    const parts = [];
    if (usage.prompt_tokens) parts.push(`${compact(usage.prompt_tokens)} ورودی`);
    if (usage.completion_tokens) parts.push(`${compact(usage.completion_tokens)} خروجی`);
    if (usage.cost) parts.push(`$${Number(usage.cost).toFixed(4)}`);
    return parts.join(' · ');
  }

  /** @param {string} text */
  function renderMarkdown(text) {
    try { return marked.parse(text || ''); } catch { return text || ''; }
  }

  const lastAssistantId = $derived([...messages].reverse().find(m => m.role === 'assistant')?.id);
</script>

<div class="relative flex flex-col h-full bg-card" style="width: {width}px" dir="rtl">
  <!-- Resize handle (inner edge) -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="absolute inset-y-0 -right-1 w-2 z-30 cursor-col-resize group/resize"
    onpointerdown={startResize}
    ondblclick={() => { width = 400; try { localStorage.setItem(WIDTH_KEY, '400'); } catch { /* ignore */ } }}
    title="کشیدن برای تغییر عرض (دابل‌کلیک: اندازه‌ی پیش‌فرض)"
  >
    <div class="mx-auto h-full w-0.5 bg-transparent group-hover/resize:bg-primary/40 transition-colors"></div>
  </div>

  <!-- Header -->
  <div class="h-11 px-2 border-b flex items-center gap-1.5 shrink-0">
    <div class="inline-flex p-0.5 rounded-lg bg-muted shrink-0" role="tablist">
      <button role="tab" aria-selected={tab === 'chat'} onclick={() => setTab('chat')}
        class="text-xs px-2.5 h-7 rounded-md transition-colors inline-flex items-center gap-1 {tab === 'chat' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        گفتگو
        {#if sending && tab !== 'chat'}<span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>{/if}
      </button>
      <button role="tab" aria-selected={tab === 'review'} onclick={() => setTab('review')}
        class="text-xs px-2.5 h-7 rounded-md transition-colors inline-flex items-center gap-1 {tab === 'review' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        بررسی کلی
        {#if reviewBusy}
          <svg class="w-3 h-3 animate-spin text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        {:else if reviewOpenCount > 0}
          <span class="text-[10px] min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center">{fa(reviewOpenCount)}</span>
        {/if}
      </button>
    </div>

    <span class="flex-1"></span>

    <!-- Model selector with search -->
    <div class="relative min-w-0">
      <button
        onclick={() => { showModelDropdown = !showModelDropdown; modelSearch = ''; }}
        class="h-7 text-[11px] px-2 rounded-md border border-input bg-background max-w-32 truncate hover:bg-muted transition-colors block"
        title="مدل گفتگو و بررسی: {modelLabel}"
      >{modelLabel}</button>
      {#if showModelDropdown}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="absolute left-0 top-8 z-50 w-64 rounded-xl border bg-popover shadow-lg" onmouseleave={() => showModelDropdown = false}>
          <div class="p-2 border-b">
            <input type="text" bind:value={modelSearch} placeholder="جستجوی مدل..." dir="rtl"
              class="w-full h-7 text-xs px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div class="max-h-52 overflow-y-auto p-1">
            {#each filteredModels as m (m.id)}
              <button
                onclick={() => { model = m.id; showModelDropdown = false; }}
                class="w-full text-right text-xs px-2 py-1.5 rounded-md hover:bg-muted transition-colors flex items-center gap-2 {model === m.id ? 'bg-primary/10 font-medium' : ''}"
              >
                <span class="text-muted-foreground text-[10px] shrink-0">{m.provider || ''}</span>
                <span class="truncate flex-1">{m.name}</span>
              </button>
            {/each}
            {#if filteredModels.length === 0}
              <p class="text-xs text-muted-foreground text-center py-3">مدلی پیدا نشد</p>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <button onclick={() => openPrompt(tab)}
      class="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
      title="دیدن و ویرایش پرامپت‌ها" aria-label="پرامپت‌ها">
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
    </button>

    {#if onClose}
      <button onclick={onClose} class="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0" title="بستن" aria-label="بستن">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    {/if}
  </div>

  <!-- ─── Chat tab ─── -->
  <div class="flex-1 flex flex-col min-h-0 {tab === 'chat' ? '' : 'hidden'}">
    <div class="flex-1 overflow-y-auto p-3 space-y-3 min-h-0" bind:this={chatEl}>
      {#if messages.length === 0 && !sending}
        <div class="pt-6 pb-2 text-center space-y-2">
          <div class="w-10 h-10 mx-auto rounded-full bg-primary/10 text-primary inline-flex items-center justify-center">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <p class="text-sm font-medium">درباره‌ی این فصل بپرسید</p>
          <p class="text-xs text-muted-foreground leading-relaxed px-2">
            {#if cfg.chatContext === 'full'}
              مدل کل فصل ({fa(paragraphCount)} بند) را با شماره‌ی بندها می‌بیند{hasRules ? '، همراه قوانین پروژه' : ''}{glossaryHits ? ` و ${fa(glossaryHits)} واژه از واژه‌نامه` : ''}. می‌توانید بنویسید «بند ۱۲ را بررسی کن».
            {:else}
              متن فصل همراه پیام‌ها ارسال نمی‌شود؛ متن موردنظر را در پیام بیاورید یا از ترجمه انتخاب کنید.
            {/if}
          </p>
        </div>
        <div class="flex flex-col gap-1.5">
          {#each suggestions as s (s)}
            <button onclick={() => send(s)} disabled={!apiKey}
              class="text-right text-xs px-3 py-2 rounded-lg border bg-background hover:bg-muted hover:border-foreground/20 disabled:opacity-50 transition-colors">{s}</button>
          {/each}
          <button onclick={() => setTab('review')}
            class="text-right text-xs px-3 py-2 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors inline-flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            بررسی کامل فصل با اصلاح یک‌کلیکی ←
          </button>
        </div>
      {:else}
        {#each messages as msg (msg.id)}
          <div class="group/msg flex flex-col {msg.role === 'user' ? 'items-start' : 'items-end'}">
            <div
              class="max-w-[92%] rounded-2xl px-3 py-2 text-xs leading-relaxed
                {msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-md'
                  : msg.isError
                    ? 'bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-md'
                    : 'bg-muted/70 text-foreground rounded-tl-md'}"
            >
              {#if msg.role === 'assistant' && !msg.isError}
                <div class="prose prose-xs dark:prose-invert max-w-none text-xs [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-pre:text-[11px]" dir="auto">
                  {@html renderMarkdown(msg.content)}
                </div>
                {#if msg.stopped}
                  <div class="text-[10px] mt-1 text-amber-700 dark:text-amber-300">(نیمه‌کاره)</div>
                {/if}
              {:else}
                <div class="whitespace-pre-wrap break-words" dir="auto">{msg.content}</div>
              {/if}
            </div>
            <!-- Meta + actions -->
            <div class="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-muted-foreground min-h-5">
              {#if msg.role === 'assistant' && msg.model}
                <span>{getModelName(msg.model)}</span>
                {#if msg.usage}<span class="opacity-70">· {usageLabel(msg.usage)}</span>{/if}
              {/if}
              <span class="inline-flex items-center opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 transition-opacity">
                {#if !msg.isError}
                  <button onclick={() => copyText(msg.content)} class="p-1 rounded hover:bg-muted hover:text-foreground" title="کپی" aria-label="کپی">
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  </button>
                {/if}
                {#if msg.role === 'assistant' && msg.id === lastAssistantId && !sending}
                  <button onclick={regenerate} class="p-1 rounded hover:bg-muted hover:text-foreground" title="پاسخ دوباره" aria-label="پاسخ دوباره">
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                  </button>
                {/if}
                <button onclick={() => deleteMessage(msg)} disabled={sending} class="p-1 rounded hover:bg-muted hover:text-destructive disabled:opacity-40" title="حذف این پیام" aria-label="حذف پیام">
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </span>
            </div>
          </div>
        {/each}

        {#if sending}
          <div class="flex flex-col items-end">
            <div class="max-w-[92%] rounded-2xl rounded-tl-md px-3 py-2 text-xs leading-relaxed bg-muted/70">
              {#if streamText}
                <div class="prose prose-xs dark:prose-invert max-w-none text-xs [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5" dir="auto">
                  {@html renderMarkdown(streamText)}
                </div>
              {:else}
                <div class="flex gap-1 py-1">
                  <div class="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]"></div>
                  <div class="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]"></div>
                  <div class="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]"></div>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      {/if}
    </div>

    <!-- Input -->
    <div class="p-2.5 border-t shrink-0 space-y-1.5">
      <!-- What the model sees -->
      <div class="flex items-center gap-1 text-[10px] text-muted-foreground flex-wrap">
        <button onclick={toggleChatContext}
          class="inline-flex items-center gap-1 h-5 px-1.5 rounded-full border transition-colors {cfg.chatContext === 'full' ? 'border-primary/30 bg-primary/5 text-primary' : 'hover:bg-muted'}"
          title={cfg.chatContext === 'full' ? 'کل متن فصل همراه هر پیام فرستاده می‌شود — کلیک برای خاموش کردن' : 'متن فصل فرستاده نمی‌شود — کلیک برای فرستادن کل فصل'}>
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
          {cfg.chatContext === 'full' ? `کل فصل (${fa(paragraphCount)} بند)` : 'بدون متن فصل'}
        </button>
        {#if hasRules}<span class="h-5 px-1.5 rounded-full border inline-flex items-center">قوانین</span>{/if}
        {#if glossaryHits}<span class="h-5 px-1.5 rounded-full border inline-flex items-center">واژه‌نامه {fa(glossaryHits)}</span>{/if}
        <span title="تخمین توکن ورودی هر پیام (بدون تاریخچه)">~{compact(chatTokens)} توکن</span>
        <span class="flex-1"></span>
        <button onclick={() => openPrompt('chat')} class="hover:text-foreground px-1">پرامپت</button>
        {#if messages.length > 0}
          <button onclick={clearChat} disabled={sending} class="hover:text-destructive px-1 disabled:opacity-40" title="پاک کردن کل گفتگو">پاک کردن</button>
        {/if}
      </div>
      <div class="flex gap-2 items-end">
        <textarea
          bind:this={inputEl}
          bind:value={input}
          oninput={autoGrow}
          onkeydown={handleKeydown}
          placeholder={apiKey ? 'پیام… (Enter ارسال، Shift+Enter خط جدید)' : 'برای گفتگو API Key را در تنظیمات وارد کنید'}
          rows={2}
          dir="rtl"
          class="flex-1 text-xs p-2 rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring max-h-40"
        ></textarea>
        {#if sending}
          <button onclick={stopChat}
            class="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
            title="توقف" aria-label="توقف">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          </button>
        {:else}
          <button onclick={() => send()} disabled={!input.trim() || !apiKey}
            class="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
            title="ارسال" aria-label="ارسال">
            <svg class="w-4 h-4 -scale-x-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3 3 3 9-3 9 19-9Z"/><path d="M6 12h16"/></svg>
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- ─── Review tab (kept mounted so a running review continues while chatting) ─── -->
  <div class="flex-1 flex flex-col min-h-0 {tab === 'review' ? '' : 'hidden'}">
    <ChapterReview
      {chapterId}
      {projectId}
      {apiKey}
      {model}
      {ctx}
      {promptConfig}
      {targetKey}
      {targetLabel}
      {applyFixes}
      {revertFixes}
      {onLocate}
      onAsk={askInChat}
      onOpenPrompt={() => openPrompt('review')}
      onPartSizeChange={(key) => savePromptConfig({ ...promptConfig, partSize: key })}
      {onRunChange}
      bind:openCount={reviewOpenCount}
      bind:busy={reviewBusy}
    />
  </div>
</div>

<ReviewPromptDialog
  bind:open={showPromptDialog}
  bind:tab={promptDialogTab}
  config={promptConfig}
  {ctx}
  onSave={savePromptConfig}
/>
