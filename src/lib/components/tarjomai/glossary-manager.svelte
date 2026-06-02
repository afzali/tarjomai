<script>
  import { onMount } from 'svelte';
  import { openrouterService } from '$lib/services/openrouter.service.js';
  import { settingsStore } from '$lib/stores/settings.store.js';
  import { fetchModels } from '$lib/stores/models.store.js';
  import { allModels } from '$lib/models.js';
  import { marked } from 'marked';
  import {
    defaultGlossaryPrompt,
    buildGlossaryExtractionMessages
  } from '$lib/prompts/glossary.prompt.js';
  import {
    autoChunkCount,
    chunkText,
    parseGlossaryResponse,
    mergeGlossaries
  } from '$lib/utils/glossary.utils.js';

  /**
   * @typedef {{ source: string, target: string, note: string }} GlossaryEntry
   */

  /**
   * @type {{
   *   entries?: GlossaryEntry[],
   *   sourceLanguage?: string,
   *   targetLanguage?: string,
   *   prompt?: string,
   *   model?: string,
   *   onChange?: (data: { entries: GlossaryEntry[], prompt: string, model: string }) => void,
   * }}
   */
  let {
    entries = $bindable([]),
    sourceLanguage = 'en',
    targetLanguage = 'fa',
    prompt = $bindable(''),
    model = $bindable(''),
    onChange = undefined
  } = $props();

  let settings = $state(/** @type {any} */ (null));
  let availableModels = $state(allModels);

  // Extraction config
  let sourceText = $state('');
  let termCount = $state(100);
  let showPromptEditor = $state(false);

  // Advanced: manual chunk override (0 = automatic based on text length)
  let showAdvanced = $state(false);
  let manualChunks = $state(0);

  // Export/import UI
  let showExportMenu = $state(false);
  let importError = $state('');

  // Auto-computed chunk count from text length (used when manualChunks is 0)
  const autoChunks = $derived(autoChunkCount(sourceText));
  const effectiveChunks = $derived(manualChunks > 0 ? manualChunks : autoChunks);

  // Extraction progress
  let extracting = $state(false);
  let doneChunks = $state(0);
  let totalChunks = $state(0);
  /** @type {AbortController | null} */
  let abortController = null;
  let extractError = $state('');

  // Model dropdown
  let modelSearch = $state('');
  let showModelDropdown = $state(false);

  // Per-word review chat
  let reviewEntry = $state(/** @type {GlossaryEntry | null} */ (null));
  let reviewIndex = $state(-1);
  let reviewMessages = $state(/** @type {{role:string,content:string,model?:string}[]} */ ([]));
  let reviewInput = $state('');
  let reviewBusy = $state(false);
  let reviewModel = $state('');
  let reviewModelSearch = $state('');
  let showReviewModelDropdown = $state(false);

  const modelLabel = $derived(
    availableModels.find(m => m.id === model)?.name || model || 'انتخاب مدل'
  );
  const reviewModelLabel = $derived(
    availableModels.find(m => m.id === reviewModel)?.name || reviewModel || 'انتخاب مدل'
  );
  const filteredModels = $derived(
    modelSearch.trim()
      ? availableModels.filter(m =>
          m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
          m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
          (m.provider || '').toLowerCase().includes(modelSearch.toLowerCase()))
      : availableModels
  );
  const filteredReviewModels = $derived(
    reviewModelSearch.trim()
      ? availableModels.filter(m =>
          m.name.toLowerCase().includes(reviewModelSearch.toLowerCase()) ||
          m.id.toLowerCase().includes(reviewModelSearch.toLowerCase()) ||
          (m.provider || '').toLowerCase().includes(reviewModelSearch.toLowerCase()))
      : availableModels
  );

  onMount(async () => {
    settings = await settingsStore.load();
    if (!prompt) prompt = defaultGlossaryPrompt;
    if (settings?.openRouterApiKey) {
      fetchModels(settings.openRouterApiKey).then(m => { availableModels = m; });
      if (!model) model = settings.defaultModels?.translation || 'anthropic/claude-sonnet-4';
      reviewModel = settings.defaultModels?.review || model;
    }
  });

  function emitChange() {
    onChange?.({ entries: [...entries], prompt, model });
  }

  function selectModel(/** @type {string} */ id) {
    model = id;
    showModelDropdown = false;
    emitChange();
  }

  function stopExtraction() { abortController?.abort(); }

  async function extract() {
    if (!sourceText.trim() || !settings?.openRouterApiKey || !model) return;
    extracting = true;
    extractError = '';
    abortController = new AbortController();
    const signal = abortController.signal;

    const chunks = chunkText(sourceText, effectiveChunks);
    totalChunks = chunks.length;
    doneChunks = 0;
    const perChunk = Math.max(10, Math.ceil(termCount / Math.max(1, chunks.length)) + 10);

    /** @type {GlossaryEntry[]} */
    let collected = [];
    try {
      for (const chunk of chunks) {
        if (signal.aborted) break;
        const { system, user } = buildGlossaryExtractionMessages({
          contentPrompt: prompt,
          chunk,
          count: perChunk,
          sourceLanguage,
          targetLanguage
        });
        const result = await openrouterService.sendMessage(
          settings.openRouterApiKey,
          model,
          [{ role: 'system', content: system }, { role: 'user', content: user }],
          { signal, temperature: 0.2 }
        );
        if (signal.aborted) break;
        if (result.success !== false) {
          const parsed = parseGlossaryResponse(result.content || '');
          collected = mergeGlossaries(collected, parsed);
        }
        doneChunks += 1;
      }

      // Merge with existing entries, then cap at termCount
      let merged = mergeGlossaries(entries, collected);
      if (merged.length > termCount) merged = merged.slice(0, termCount);
      entries = merged;
      emitChange();
    } catch (/** @type {any} */ e) {
      if (e?.name !== 'AbortError') extractError = e?.message || 'خطا در استخراج';
    } finally {
      extracting = false;
      abortController = null;
    }
  }

  function addEmptyRow() {
    entries = [...entries, { source: '', target: '', note: '' }];
    emitChange();
  }

  function deleteEntry(/** @type {number} */ i) {
    entries = entries.filter((_, idx) => idx !== i);
    emitChange();
  }

  function clearAll() {
    if (!confirm('کل واژه‌نامه پاک شود؟')) return;
    entries = [];
    emitChange();
  }

  // --- Export / Import ---
  /** @param {Blob} blob @param {string} filename */
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    if (entries.length === 0) return;
    const data = {
      type: 'tarjomai-glossary',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      sourceLanguage,
      targetLanguage,
      entries: entries.map(e => ({ source: e.source, target: e.target, note: e.note || '' }))
    };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'glossary.json');
    showExportMenu = false;
  }

  /** Escape a value for CSV (quotes, commas, newlines). */
  function csvCell(/** @type {string} */ v) {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function exportCsv() {
    if (entries.length === 0) return;
    const rows = [['source', 'target', 'note'], ...entries.map(e => [e.source, e.target, e.note || ''])];
    const csv = rows.map(r => r.map(csvCell).join(',')).join('\r\n');
    // Prepend BOM so Excel reads UTF-8 (Persian/Arabic) correctly
    downloadBlob(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), 'glossary.csv');
    showExportMenu = false;
  }

  /**
   * Parse CSV text into glossary entries. Expects a header row containing
   * source/target/note (case-insensitive); falls back to positional columns.
   * @param {string} text
   * @returns {GlossaryEntry[]}
   */
  function parseCsv(text) {
    const rows = parseCsvRows(text);
    if (rows.length === 0) return [];
    let startIdx = 0;
    let srcCol = 0, tgtCol = 1, noteCol = 2;
    const header = rows[0].map(h => h.trim().toLowerCase());
    const hasHeader = header.some(h => ['source', 'target', 'note', 'مبدأ', 'مبدا', 'مقصد', 'یادداشت'].includes(h));
    if (hasHeader) {
      startIdx = 1;
      const find = (/** @type {string[]} */ names) => header.findIndex(h => names.includes(h));
      const s = find(['source', 'مبدأ', 'مبدا']);
      const t = find(['target', 'مقصد']);
      const n = find(['note', 'یادداشت']);
      if (s !== -1) srcCol = s;
      if (t !== -1) tgtCol = t;
      if (n !== -1) noteCol = n;
    }
    /** @type {GlossaryEntry[]} */
    const out = [];
    for (let i = startIdx; i < rows.length; i++) {
      const r = rows[i];
      const source = (r[srcCol] || '').trim();
      const target = (r[tgtCol] || '').trim();
      const note = (r[noteCol] || '').trim();
      if (source && target) out.push({ source, target, note });
    }
    return out;
  }

  /**
   * Minimal RFC-4180-ish CSV row parser (handles quotes, escaped quotes, newlines in quotes).
   * @param {string} text
   * @returns {string[][]}
   */
  function parseCsvRows(text) {
    const clean = String(text || '').replace(/^\uFEFF/, '');
    /** @type {string[][]} */
    const rows = [];
    /** @type {string[]} */
    let row = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < clean.length; i++) {
      const c = clean[i];
      if (inQuotes) {
        if (c === '"') {
          if (clean[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field); field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && clean[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.some(f => f.trim() !== '')) rows.push(row);
        row = [];
      } else field += c;
    }
    if (field !== '' || row.length > 0) {
      row.push(field);
      if (row.some(f => f.trim() !== '')) rows.push(row);
    }
    return rows;
  }

  async function handleImportFile(/** @type {Event} */ e) {
    const input = /** @type {HTMLInputElement} */ (e.target);
    const file = input.files?.[0];
    if (!file) return;
    importError = '';
    try {
      const text = await file.text();
      /** @type {GlossaryEntry[]} */
      let imported = [];
      if (file.name.toLowerCase().endsWith('.csv')) {
        imported = parseCsv(text);
      } else {
        const data = JSON.parse(text);
        const raw = Array.isArray(data) ? data : (data.entries || []);
        imported = parseGlossaryResponse(JSON.stringify(raw));
      }
      if (imported.length === 0) {
        importError = 'موردی برای ورود پیدا نشد';
      } else {
        entries = mergeGlossaries(entries, imported);
        emitChange();
      }
    } catch (/** @type {any} */ err) {
      importError = 'خطا در خواندن فایل: ' + (err?.message || '');
    } finally {
      input.value = '';
    }
  }

  // --- Per-word AI review chat ---
  function openReview(/** @type {GlossaryEntry} */ entry, /** @type {number} */ i) {
    reviewEntry = entry;
    reviewIndex = i;
    reviewMessages = [];
    reviewInput = `معادل پیشنهادی برای «${entry.source}» را «${entry.target}» گذاشته‌ام. به نظرت این ترجمه دقیق و مناسب است؟ اگر بهتری سراغ داری پیشنهاد بده و دلیلش را بگو.`;
  }

  function closeReview() {
    reviewEntry = null;
    reviewIndex = -1;
    reviewMessages = [];
    reviewInput = '';
  }

  async function sendReview() {
    if (!reviewInput.trim() || reviewBusy || !settings?.openRouterApiKey || !reviewModel || !reviewEntry) return;
    const userMsg = reviewInput.trim();
    reviewInput = '';
    reviewBusy = true;
    reviewMessages = [...reviewMessages, { role: 'user', content: userMsg }];

    const system = `تو یک مترجم و فرهنگ‌نویس خبره هستی. درباره‌ی معادل‌گزینی یک اصطلاح در واژه‌نامه با کاربر گفتگو می‌کنی.
اصطلاح مبدأ: «${reviewEntry.source}»
معادل فعلی در مقصد: «${reviewEntry.target}»${reviewEntry.note ? `\nیادداشت: ${reviewEntry.note}` : ''}
نظرت را دقیق، کوتاه و کاربردی بده. اگر معادل بهتری پیشنهاد می‌کنی، آن را واضح مشخص کن.`;

    try {
      const history = reviewMessages.map(m => ({ role: m.role, content: m.content }));
      const result = await openrouterService.sendMessage(
        settings.openRouterApiKey,
        reviewModel,
        [{ role: 'system', content: system }, ...history]
      );
      const content = result.content || result.error || 'خطا در دریافت پاسخ';
      reviewMessages = [...reviewMessages, { role: 'assistant', content, model: reviewModel }];
    } catch (/** @type {any} */ e) {
      reviewMessages = [...reviewMessages, { role: 'assistant', content: 'خطا: ' + (e?.message || '') }];
    } finally {
      reviewBusy = false;
    }
  }

  function renderMarkdown(/** @type {string} */ text) {
    try { return marked.parse(text || ''); } catch { return text || ''; }
  }

  const progressPercent = $derived(
    totalChunks > 0 ? Math.round((doneChunks / totalChunks) * 100) : 0
  );
</script>

<div class="space-y-5" dir="rtl">
  <!-- Extraction panel -->
  <div class="rounded-xl border bg-card p-4 space-y-3">
    <div class="flex items-center gap-2">
      <svg class="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>
      <h3 class="text-sm font-semibold">استخراج خودکار از متن</h3>
    </div>
    <p class="text-xs text-muted-foreground leading-relaxed">
      بخشی از متن را وارد کن. متن به‌صورت خودکار به چند تکه تقسیم می‌شود و از هر تکه مهم‌ترین اصطلاحات استخراج و در واژه‌نامه ادغام می‌شوند (تکراری‌ها حذف می‌شوند).
    </p>

    <textarea bind:value={sourceText} rows="6" dir="auto" placeholder="متن مبدأ را اینجا بچسبان..."
      class="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"></textarea>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div class="space-y-1">
        <label for="gl-terms" class="text-xs font-medium">حداکثر تعداد واژه</label>
        <input id="gl-terms" type="number" min="10" max="1000" step="10" bind:value={termCount}
          class="w-full h-8 text-sm px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"/>
      </div>
      <div class="space-y-1">
        <span class="text-xs font-medium block">مدل استخراج</span>
        <div class="relative">
          <button onclick={() => { showModelDropdown = !showModelDropdown; modelSearch = ''; }}
            class="w-full h-8 text-xs px-2 rounded-md border border-input bg-background text-right truncate hover:bg-muted transition-colors">
            {modelLabel}
          </button>
          {#if showModelDropdown}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="absolute right-0 top-9 z-50 w-full min-w-56 rounded-xl border bg-popover shadow-lg" onmouseleave={() => showModelDropdown = false}>
              <div class="p-2 border-b">
                <input type="text" bind:value={modelSearch} placeholder="جستجوی مدل..." dir="rtl"
                  class="w-full h-7 text-xs px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"/>
              </div>
              <div class="max-h-52 overflow-y-auto p-1">
                {#each filteredModels as m (m.id)}
                  <button onclick={() => selectModel(m.id)}
                    class="w-full text-right text-xs px-2 py-1.5 rounded-md hover:bg-muted transition-colors flex items-center gap-2 {model === m.id ? 'bg-primary/10 font-medium' : ''}">
                    <span class="text-muted-foreground text-[10px] shrink-0">{m.provider || ''}</span>
                    <span class="truncate flex-1">{m.name}</span>
                  </button>
                {/each}
                {#if filteredModels.length === 0}<p class="text-xs text-muted-foreground text-center py-3">مدلی پیدا نشد</p>{/if}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Advanced: manual chunk override -->
    <div>
      <button onclick={() => showAdvanced = !showAdvanced}
        class="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
        <svg class="w-3 h-3 transition-transform {showAdvanced ? 'rotate-90' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        تنظیمات پیشرفته
      </button>
      {#if showAdvanced}
        <div class="mt-2 flex items-center gap-3 flex-wrap">
          <div class="space-y-1">
            <label for="gl-chunks" class="text-xs font-medium">تعداد تکه‌ها</label>
            <input id="gl-chunks" type="number" min="0" max="50" bind:value={manualChunks}
              class="w-28 h-8 text-sm px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"/>
          </div>
          <p class="text-[10px] text-muted-foreground flex-1 min-w-40 leading-relaxed">
            متن برای استخراج بهتر به چند تکه تقسیم و از هر تکه جدا اصطلاح استخراج می‌شود.
            عدد <code class="px-1 rounded bg-muted">۰</code> یعنی خودکار بر اساس طول متن
            {#if sourceText.trim()}(الان: {autoChunks} تکه){/if}.
            فقط اگر لازم داری دستی تغییر بده.
          </p>
        </div>
      {/if}
    </div>

    <!-- Editable content prompt (format instruction stays fixed/hidden) -->
    <div>
      <button onclick={() => showPromptEditor = !showPromptEditor}
        class="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
        <svg class="w-3 h-3 transition-transform {showPromptEditor ? 'rotate-90' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        {showPromptEditor ? 'بستن پرامپت' : 'مشاهده / ویرایش پرامپت استخراج'}
      </button>
      {#if showPromptEditor}
        <div class="mt-2 space-y-1.5">
          <textarea bind:value={prompt} onblur={emitChange} rows="6" dir="rtl"
            class="w-full px-3 py-2 rounded-md border border-input bg-background text-xs resize-y focus:outline-none focus:ring-2 focus:ring-ring font-mono leading-relaxed"></textarea>
          <p class="text-[10px] text-muted-foreground">
            از <code class="px-1 rounded bg-muted">{'{{count}}'}</code> برای تعداد واژه استفاده کن. قالب خروجی JSON به‌صورت سیستمی و ثابت اضافه می‌شود و قابل تغییر نیست تا نمایش جدول دچار مشکل نشود.
          </p>
        </div>
      {/if}
    </div>

    {#if extracting}
      <div class="space-y-1.5">
        <div class="flex items-center justify-between text-xs text-muted-foreground">
          <span>در حال استخراج… تکه {doneChunks}/{totalChunks}</span>
          <span>{progressPercent}٪</span>
        </div>
        <div class="h-1.5 rounded-full bg-muted overflow-hidden">
          <div class="h-full rounded-full bg-primary transition-all duration-300" style="width: {progressPercent}%"></div>
        </div>
      </div>
    {/if}

    {#if extractError}
      <p class="text-xs text-destructive">{extractError}</p>
    {/if}

    <div class="flex items-center gap-2">
      {#if extracting}
        <button onclick={stopExtraction}
          class="h-8 px-3 rounded-md text-xs bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 transition-colors">توقف</button>
      {:else}
        <button onclick={extract} disabled={!sourceText.trim() || !model}
          class="h-8 px-3 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
          استخراج واژه‌ها
        </button>
      {/if}
      {#if !settings?.openRouterApiKey}
        <span class="text-[11px] text-amber-600 dark:text-amber-400">ابتدا API Key را در تنظیمات وارد کنید</span>
      {/if}
    </div>
  </div>

  <!-- Glossary table -->
  <div class="rounded-xl border bg-card">
    <div class="flex items-center justify-between px-4 py-2.5 border-b">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold">واژه‌نامه</h3>
        <span class="text-[11px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{entries.length} واژه</span>
      </div>
      <div class="flex items-center gap-1.5">
        <button onclick={addEmptyRow}
          class="h-7 px-2 rounded-md text-xs border border-input bg-background hover:bg-muted transition-colors inline-flex items-center gap-1">
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          افزودن
        </button>

        <!-- Import -->
        <label class="h-7 px-2 rounded-md text-xs border border-input bg-background hover:bg-muted transition-colors inline-flex items-center gap-1 cursor-pointer" title="ورود از JSON یا CSV">
          <input type="file" accept=".json,.csv" class="hidden" onchange={handleImportFile} />
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
          ورودی
        </label>

        <!-- Export -->
        {#if entries.length > 0}
          <div class="relative">
            <button onclick={() => showExportMenu = !showExportMenu}
              class="h-7 px-2 rounded-md text-xs border border-input bg-background hover:bg-muted transition-colors inline-flex items-center gap-1" title="خروجی">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5-5 5 5"/><path d="M12 15V3"/></svg>
              خروجی
            </button>
            {#if showExportMenu}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="absolute left-0 top-8 z-50 w-32 rounded-xl border bg-popover shadow-lg py-1" onmouseleave={() => showExportMenu = false}>
                <button onclick={exportJson} class="w-full text-right text-xs px-3 py-1.5 hover:bg-muted transition-colors">JSON</button>
                <button onclick={exportCsv} class="w-full text-right text-xs px-3 py-1.5 hover:bg-muted transition-colors">CSV (اکسل)</button>
              </div>
            {/if}
          </div>
          <button onclick={clearAll}
            class="h-7 px-2 rounded-md text-xs border border-input bg-background text-muted-foreground hover:text-destructive hover:bg-muted transition-colors">پاک‌سازی</button>
        {/if}
      </div>
    </div>

    {#if importError}
      <p class="px-4 py-2 text-xs text-destructive border-b">{importError}</p>
    {/if}

    {#if entries.length === 0}
      <div class="px-4 py-10 text-center">
        <p class="text-sm text-muted-foreground">واژه‌نامه خالی است. از متن استخراج کن، دستی اضافه کن یا یک فایل JSON/CSV وارد کن.</p>
      </div>
    {:else}
      <div class="max-h-[420px] overflow-y-auto divide-y">
        <!-- Header row -->
        <div class="grid grid-cols-[1fr_1fr_1.2fr_auto] gap-2 px-3 py-2 text-[11px] font-medium text-muted-foreground bg-muted/40 sticky top-0 z-10">
          <span>مبدأ</span>
          <span>مقصد</span>
          <span>یادداشت</span>
          <span class="w-16 text-center">عملیات</span>
        </div>
        {#each entries as entry, i (i)}
          <div class="grid grid-cols-[1fr_1fr_1.2fr_auto] gap-2 px-3 py-1.5 items-center hover:bg-muted/30 transition-colors">
            <input bind:value={entry.source} onblur={emitChange} dir="auto"
              class="h-8 text-sm px-2 rounded-md border border-transparent hover:border-input focus:border-input bg-transparent focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring"/>
            <input bind:value={entry.target} onblur={emitChange} dir="auto"
              class="h-8 text-sm px-2 rounded-md border border-transparent hover:border-input focus:border-input bg-transparent focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring"/>
            <input bind:value={entry.note} onblur={emitChange} dir="auto" placeholder="—"
              class="h-8 text-xs px-2 rounded-md border border-transparent hover:border-input focus:border-input bg-transparent focus:bg-background text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"/>
            <div class="w-16 flex items-center justify-center gap-1">
              <button onclick={() => openReview(entry, i)} title="بررسی با هوش مصنوعی"
                class="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
              </button>
              <button onclick={() => deleteEntry(i)} title="حذف"
                class="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Per-word review chat modal -->
{#if reviewEntry}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={closeReview}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-card border rounded-xl w-full max-w-lg shadow-xl flex flex-col max-h-[85vh]" onclick={(e) => e.stopPropagation()} dir="rtl">
      <div class="flex items-center justify-between gap-2 p-3 border-b shrink-0">
        <div class="min-w-0">
          <span class="text-sm font-semibold">بررسی معادل</span>
          <span class="text-xs text-muted-foreground mr-1 truncate">«{reviewEntry.source}» → «{reviewEntry.target}»</span>
        </div>
        <div class="flex items-center gap-2">
          <!-- review model selector -->
          <div class="relative">
            <button onclick={() => { showReviewModelDropdown = !showReviewModelDropdown; reviewModelSearch = ''; }}
              class="h-7 text-xs px-2 rounded-md border border-input bg-background max-w-32 truncate hover:bg-muted transition-colors" title={reviewModelLabel}>
              {reviewModelLabel}
            </button>
            {#if showReviewModelDropdown}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="absolute left-0 top-8 z-50 w-60 rounded-xl border bg-popover shadow-lg" onmouseleave={() => showReviewModelDropdown = false}>
                <div class="p-2 border-b">
                  <input type="text" bind:value={reviewModelSearch} placeholder="جستجوی مدل..." dir="rtl"
                    class="w-full h-7 text-xs px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"/>
                </div>
                <div class="max-h-48 overflow-y-auto p-1">
                  {#each filteredReviewModels as m (m.id)}
                    <button onclick={() => { reviewModel = m.id; showReviewModelDropdown = false; }}
                      class="w-full text-right text-xs px-2 py-1.5 rounded-md hover:bg-muted transition-colors flex items-center gap-2 {reviewModel === m.id ? 'bg-primary/10 font-medium' : ''}">
                      <span class="text-muted-foreground text-[10px] shrink-0">{m.provider || ''}</span>
                      <span class="truncate flex-1">{m.name}</span>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
          <button onclick={closeReview} class="text-muted-foreground hover:text-foreground transition-colors" title="بستن">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {#if reviewMessages.length === 0}
          <p class="text-xs text-muted-foreground text-center mt-4">سوالت درباره‌ی این معادل را بپرس. نظر مدل صرفاً مشورتی است؛ تغییر نهایی را خودت دستی اعمال می‌کنی.</p>
        {/if}
        {#each reviewMessages as msg}
          <div class="flex {msg.role === 'user' ? 'justify-start' : 'justify-end'}">
            <div class="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed {msg.role === 'user' ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'}">
              {#if msg.role === 'assistant'}
                <div class="prose prose-xs dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{@html renderMarkdown(msg.content)}</div>
              {:else}
                <div class="whitespace-pre-wrap break-words">{msg.content}</div>
              {/if}
            </div>
          </div>
        {/each}
        {#if reviewBusy}
          <div class="flex justify-end">
            <div class="bg-primary/20 rounded-xl px-3 py-2 flex gap-1">
              <div class="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]"></div>
              <div class="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]"></div>
              <div class="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]"></div>
            </div>
          </div>
        {/if}
      </div>

      <div class="p-3 border-t shrink-0">
        <div class="flex gap-2">
          <textarea bind:value={reviewInput} rows="2" dir="rtl" placeholder="پیام..."
            class="flex-1 text-xs p-2 rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReview(); } }}></textarea>
          <button onclick={sendReview} disabled={reviewBusy || !reviewInput.trim() || !reviewModel}
            class="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors self-end" aria-label="ارسال">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3 3 3 9-3 9 19-9Z"/><path d="M6 12h16"/></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
