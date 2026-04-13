<script>
  import { page } from '$app/stores';
  import { onMount, onDestroy, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentProjectStore } from '$lib/stores/currentProject.store.js';
  import projectsService from '$lib/services/projects.service.js';
  import chaptersService from '$lib/services/chapters.service.js';
  import operationConfigService from '$lib/services/operationConfig.service.js';
  import { settingsStore } from '$lib/stores/settings.store.js';
  import { openrouterService } from '$lib/services/openrouter.service.js';
  import { exportUtils } from '$lib/utils/export.utils.js';
  import { fetchModels } from '$lib/stores/models.store.js';
  import { allModels } from '$lib/models.js';
  import BlockEditor from '$lib/components/tarjomai/block-editor.svelte';
  import DiffView from '$lib/components/tarjomai/diff-view.svelte';
  import FileTypeIcon from '$lib/components/tarjomai/file-type-icon.svelte';
  import ReviewPanel from '$lib/components/tarjomai/review-panel.svelte';
  import { usageService } from '$lib/services/usage.service.js';

  let projectId = $derived(parseInt($page.params.id || '0', 10) || 0);
  /** @type {any} */
  let project = $state(null);
  /** @type {any} */
  let config = $state(null);
  /** @type {any[]} */
  let chapters = $state([]);
  /** @type {any} */
  let selectedChapter = $state(null);
  let loading = $state(true);
  /** @type {any} */
  let settings = $state(null);

  // Processing state
  let processing = $state(false);
  let processingIndex = $state(-1);
  /** @type {AbortController | null} */
  let abortController = $state(null);

  // Block-based state — each block is one paragraph/heading/etc
  /**
   * @typedef {{ id: string, type: string, content: string, outputText?: string, editedText?: string|null, status?: string, outOfSync?: boolean, _editing?: boolean, _editVal?: string }} Block
   */
  /** @type {Block[]} */
  let blocks = $state([]);

  // Hover sync between columns
  let hoveredBlockId = $state('');

  // Scroll sync between source and output columns
  /** @type {HTMLElement | null} */
  let sourceScrollEl = $state(null);
  /** @type {HTMLElement | null} */
  let outputScrollEl = $state(null);
  let _syncingScroll = false;

  function onSourceScroll() {
    if (_syncingScroll || !outputScrollEl || !sourceScrollEl) return;
    _syncingScroll = true;
    const ratio = sourceScrollEl.scrollTop / (sourceScrollEl.scrollHeight - sourceScrollEl.clientHeight || 1);
    outputScrollEl.scrollTop = ratio * (outputScrollEl.scrollHeight - outputScrollEl.clientHeight);
    requestAnimationFrame(() => { _syncingScroll = false; });
  }

  function onOutputScroll() {
    if (_syncingScroll || !sourceScrollEl || !outputScrollEl) return;
    _syncingScroll = true;
    const ratio = outputScrollEl.scrollTop / (outputScrollEl.scrollHeight - outputScrollEl.clientHeight || 1);
    sourceScrollEl.scrollTop = ratio * (sourceScrollEl.scrollHeight - sourceScrollEl.clientHeight);
    requestAnimationFrame(() => { _syncingScroll = false; });
  }

  // Selection-based chat quote
  let selectionPopup = $state(/** @type {{ x: number, y: number, text: string } | null} */ (null));

  // Confirm reset dialog
  let showResetConfirm = $state(false);

  // New chapter
  let showNewChapterModal = $state(false);
  let newChapterTitle = $state('');

  // Review chat
  let reviewOpen = $state(false);
  let reviewQuote = $state('');

  // Model for editing
  let editingModel = $state('google/gemini-flash-1.5');
  let reviewModel = $state('google/gemini-flash-1.5');
  let availableModels = $state(allModels);
  let modelSearch = $state('');
  let showModelDropdown = $state(false);

  // Prompt editor popup
  let showPromptEditor = $state(false);
  let promptEditorValue = $state('');

  // Show/hide diff highlights
  let showDiff = $state(true);

  // Stats popup
  let showStats = $state(false);
  /** @type {{ totalCost: number, totalTokens: number, requests: number } | null} */
  let chapterCostStats = $state(null);

  // Progress
  const processProgress = $derived(
    blocks.length > 0
      ? Math.round((blocks.filter(b => b.outputText).length / blocks.length) * 100)
      : 0
  );

  const outOfSyncBlocks = $derived(blocks.filter(b => b.outOfSync));

  const stats = $derived.by(() => {
    const total = blocks.length;
    const edited = blocks.filter(b => b.status === 'edited').length;
    const outOfSync = blocks.filter(b => b.outOfSync).length;
    const done = blocks.filter(b => b.outputText && !b.outOfSync).length;
    const inputChars = blocks.reduce((a, b) => a + (b.content?.length || 0), 0);
    const outputChars = blocks.reduce((a, b) => a + (b.outputText?.length || 0), 0);
    const approxInputTokens = Math.round(inputChars / 4);
    const approxOutputTokens = Math.round(outputChars / 4);
    const editStats = selectedChapter?.editStats || { wordChanges: 0, wsChanges: 0, runs: 0 };
    return { total, edited, outOfSync, done, approxInputTokens, approxOutputTokens, editStats };
  });

  const isSetupIncomplete = $derived(
    project && project.setupStep && project.setupStep !== 'completed'
  );

  onMount(async () => {
    settings = await settingsStore.load();
    const loaded = await currentProjectStore.load(projectId);
    if (!loaded) { goto('/'); return; }

    project = loaded.project;
    chapters = loaded.chapters;
    config = loaded.config;

    // Redirect if wrong operation type
    if (project.operationType !== 'editorial') {
      goto(`/projects/${projectId}`);
      return;
    }

    // Per-document saved model takes priority
    if (project.editingModel) {
      editingModel = project.editingModel;
      reviewModel = project.chatModel || project.editingModel;
    } else if (project.defaultModel) {
      editingModel = project.defaultModel;
      reviewModel = project.defaultModel;
    } else if (settings?.defaultModels?.editorial) {
      editingModel = settings.defaultModels.editorial;
      reviewModel = settings.defaultModels?.review || settings.defaultModels.editorial;
    }

    if (chapters.length > 0) selectChapter(chapters[0]);

    // Fetch models for selector
    if (settings?.openRouterApiKey) {
      fetchModels(settings.openRouterApiKey).then(m => { availableModels = m; });
    }

    loading = false;
  });

  /** @type {(() => void) | null} */
  let _storeUnsub = null;

  onMount(() => {
    _storeUnsub = currentProjectStore.subscribe(v => {
      if (v.project) project = v.project;
      if (v.chapters) {
        chapters = v.chapters;
        if (selectedChapter) {
          const updated = v.chapters.find((/** @type {any} */ c) => c.id === selectedChapter.id);
          if (updated) {
            selectedChapter = updated;
            blocks = migrateToBlocks(updated);
          }
        }
      }
      if (v.config) config = v.config;
    });
  });

  onDestroy(() => { if (_storeUnsub) _storeUnsub(); });

  // --- Block helpers ---
  function uid() { return Math.random().toString(36).slice(2, 10); }

  /** Migrate old sourceText string → blocks array */
  function migrateToBlocks(/** @type {any} */ chapter) {
    if (chapter.blocks && chapter.blocks.length > 0) return chapter.blocks;
    // If we have old segmentData, convert each segment to a block
    if (chapter.segmentData && chapter.segmentData.length > 0) {
      return chapter.segmentData.map((/** @type {any} */ s) => ({
        id: s.id || uid(),
        type: 'paragraph',
        content: s.sourceText || '',
        outputText: s.outputText || '',
        editedText: s.editedText || null,
        status: s.status || 'pending',
        outOfSync: s.outOfSync || false
      }));
    }
    // Plain sourceText → split by double-newline
    const src = chapter.sourceText || '';
    if (!src.trim()) return [{ id: uid(), type: 'paragraph', content: '', status: 'pending' }];
    return src.split(/\n{2,}/).map((/** @type {string} */ p) => ({
      id: uid(), type: 'paragraph', content: p.trim(), status: 'pending'
    })).filter((/** @type {any} */ b) => b.content);
  }

  function selectChapter(/** @type {any} */ chapter) {
    selectedChapter = chapter;
    blocks = migrateToBlocks(chapter);
    processingIndex = -1;
  }

  async function saveBlocks() {
    if (!selectedChapter) return;
    const finalOutput = blocks.map(b => {
      if (b.status === 'edited') return b.editedText || b.outputText || '';
      return b.outputText || b.content;
    }).join('\n\n');
    await currentProjectStore.updateChapter(selectedChapter.id, {
      blocks,
      outputText: finalOutput,
      status: blocks.some(b => b.outputText) ? 'completed' : 'pending'
    });
  }

  /** Called by BlockEditor when user edits source blocks */
  async function onBlocksChange(/** @type {Block[]} */ newBlocks) {
    // mark blocks whose content changed and had output as outOfSync
    blocks = newBlocks.map((b, i) => {
      const old = blocks[i];
      if (old && old.id === b.id && old.content !== b.content && b.outputText) {
        return { ...b, outOfSync: true };
      }
      return b;
    });
    await saveBlocks();
  }

  function getSystemPrompt() {
    return promptEditorValue ||
      config?.systemPrompt ||
      operationConfigService.buildEditorialPrompt(config?.options || {}, project?.sourceLanguage);
  }

  async function processAllBlocks() {
    if (!selectedChapter || !settings?.openRouterApiKey) return;
    const prompt = getSystemPrompt();
    // Reset outputs for all blocks
    blocks = blocks.map(b => ({ ...b, outputText: '', status: 'pending', editedText: null, outOfSync: false }));
    await runBlockProcessing(blocks, prompt);
  }

  async function reprocessOutOfSync() {
    if (!selectedChapter || !settings?.openRouterApiKey) return;
    const prompt = getSystemPrompt();
    const toProcess = blocks.filter(b => b.outOfSync);
    await runBlockProcessing(toProcess, prompt);
  }

  /** @param {Block} block */
  async function reprocessSingleBlock(block) {
    if (!selectedChapter || !settings?.openRouterApiKey) return;
    const prompt = getSystemPrompt();
    await runBlockProcessing([block], prompt);
  }

  /**
   * Count word-level changes between two strings (simple proxy for fixes)
   * @param {string} src @param {string} out
   */
  function countChanges(src, out) {
    const sw = src.split(/\s+/).filter(Boolean);
    const ow = out.split(/\s+/).filter(Boolean);
    let changes = 0;
    const len = Math.max(sw.length, ow.length);
    for (let i = 0; i < len; i++) { if (sw[i] !== ow[i]) changes++; }
    // Rough heuristic: half-space / spacing fixes ≈ whitespace diff
    const wsChanges = Math.abs(
      (src.match(/[\u200c\u200d\s]/g) || []).length -
      (out.match(/[\u200c\u200d\s]/g) || []).length
    );
    return { wordChanges: changes, wsChanges };
  }

  /**
   * @param {Block[]} targetBlocks
   * @param {string} prompt
   */
  async function runBlockProcessing(targetBlocks, prompt) {
    processing = true;
    abortController = new AbortController();
    let runWordChanges = 0;
    let runWsChanges = 0;
    try {
      for (const block of targetBlocks) {
        if (abortController.signal.aborted) break;
        if (!block.content.trim()) continue;
        const idx = blocks.findIndex(b => b.id === block.id);
        if (idx === -1) continue;
        processingIndex = idx;
        try {
          const result = await openrouterService.sendMessage(
            settings.openRouterApiKey, editingModel,
            [{ role: 'system', content: prompt }, { role: 'user', content: block.content }],
            { signal: abortController.signal, projectId, chapterId: selectedChapter?.id }
          );
          const output = result.content || '';
          const { wordChanges, wsChanges } = countChanges(block.content, output);
          runWordChanges += wordChanges;
          runWsChanges += wsChanges;
          blocks[idx] = { ...blocks[idx], outputText: output, status: 'pending', editedText: null, outOfSync: false };
          blocks = [...blocks];
          await saveBlocks();
        } catch (/** @type {any} */ err) {
          if (err?.name === 'AbortError') break;
          blocks[idx] = { ...blocks[idx], outputText: '[خطا]', outOfSync: false };
          blocks = [...blocks];
        }
      }
    } finally {
      processing = false;
      processingIndex = -1;
      abortController = null;
      // Accumulate edit stats on chapter
      if (runWordChanges > 0 || runWsChanges > 0) {
        const prev = selectedChapter?.editStats || { wordChanges: 0, wsChanges: 0, runs: 0 };
        await currentProjectStore.updateChapter(selectedChapter.id, {
          editStats: {
            wordChanges: (prev.wordChanges || 0) + runWordChanges,
            wsChanges: (prev.wsChanges || 0) + runWsChanges,
            runs: (prev.runs || 0) + 1
          }
        });
      }
      await saveBlocks();
    }
  }

  function stopProcessing() { abortController?.abort(); }

  async function openStatsPopup() {
    if (selectedChapter) {
      chapterCostStats = await usageService.getChapterStats(selectedChapter.id);
    }
    showStats = true;
  }

  function openPromptEditor() {
    promptEditorValue = config?.systemPrompt ||
      operationConfigService.buildEditorialPrompt(config?.options || {}, project?.sourceLanguage);
    showPromptEditor = true;
  }

  async function savePrompt() {
    config = { ...(config || {}), systemPrompt: promptEditorValue };
    await currentProjectStore.saveConfig(config);
    showPromptEditor = false;
  }

  function handleChatAbout(/** @type {string} */ text) {
    reviewQuote = `> "${text}"\n\n`;
    reviewOpen = true;
  }

  function handleExport(/** @type {string} */ format) {
    if (!project || !chapters.length) return;
    if (format === 'word') {
      exportUtils.exportToWord(project, chapters, { outputLabel: 'ویرایش‌شده' });
    } else if (format === 'markdown') {
      const md = exportUtils.exportToMarkdown(project, chapters, { outputLabel: 'ویرایش‌شده' });
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      exportUtils.downloadFile(blob, `${project.title}.md`);
    }
  }

  async function changeModel(/** @type {string} */ modelId) {
    editingModel = modelId;
    reviewModel = modelId;
    showModelDropdown = false;
    await projectsService.updateProject(projectId, { editingModel: modelId, chatModel: modelId });
    if (project) project = { ...project, editingModel: modelId, chatModel: modelId };
  }

  const editingModelLabel = $derived(
    availableModels.find(m => m.id === editingModel)?.name || editingModel
  );

  const filteredModels = $derived(
    modelSearch.trim()
      ? availableModels.filter(m =>
          m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
          m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
          (m.provider || '').toLowerCase().includes(modelSearch.toLowerCase())
        )
      : availableModels
  );

  async function addChapter() {
    if (!newChapterTitle.trim()) return;
    await currentProjectStore.addChapter({ title: newChapterTitle.trim(), sourceText: '' });
    newChapterTitle = '';
    showNewChapterModal = false;
  }

  async function deleteChapter(/** @type {any} */ _chapter) {
    if (!confirm(`حذف فصل «${_chapter.title}»؟`)) return;
    await currentProjectStore.deleteChapter(_chapter.id);
    if (selectedChapter?.id === _chapter.id) { selectedChapter = null; blocks = []; }
  }

  function confirmReset() { showResetConfirm = true; }

  async function doReset() {
    blocks = blocks.map(b => ({ ...b, outputText: '', status: 'pending', editedText: null, outOfSync: false }));
    await saveBlocks();
    showResetConfirm = false;
  }

  function computeFinalOutput() {
    return blocks.map(b => b.status === 'edited' ? (b.editedText || b.outputText || '') : (b.outputText || b.content)).join('\n\n');
  }
</script>

<div class="flex h-screen overflow-hidden bg-background" dir="rtl">
  <!-- Sidebar -->
  <div class="w-60 shrink-0 border-l flex flex-col bg-card">
    <div class="p-3 border-b">
      <a href="/" class="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors min-w-0">
        <FileTypeIcon operationType="editorial" size="sm" showExtension={false} />
        <span class="truncate">{project?.title || '...'}</span>
      </a>
    </div>
    <div class="flex-1 overflow-y-auto p-2 space-y-0.5">
      {#each chapters as chapter (chapter.id)}
        <div class="group flex items-center gap-1 rounded-lg {selectedChapter?.id === chapter.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}">
          <button onclick={() => selectChapter(chapter)} class="flex-1 text-right px-3 py-2 text-sm truncate">
            <div class="flex items-center gap-1">
              <span class="truncate">{chapter.title}</span>
              {#if chapter.status === 'completed'}
                <svg class="w-3 h-3 shrink-0 {selectedChapter?.id === chapter.id ? 'text-primary-foreground/70' : 'text-green-500'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
              {/if}
            </div>
          </button>
          <button onclick={() => deleteChapter(chapter)} title="حذف فصل"
            class="p-1.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity {selectedChapter?.id === chapter.id ? 'text-primary-foreground/70 hover:text-primary-foreground' : 'text-muted-foreground hover:text-destructive'}">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      {/each}
    </div>
    <div class="p-2 border-t">
      <button onclick={() => showNewChapterModal = true}
        class="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        فصل جدید
      </button>
    </div>
  </div>

  <!-- Main area -->
  <div class="flex-1 flex flex-col min-w-0">
    <!-- Top bar -->
    <div class="border-b bg-card px-4 py-2 flex items-center gap-2 flex-wrap">
      {#if isSetupIncomplete}
        <a href="/projects/{projectId}/editorial-setup" class="text-xs text-amber-600 hover:underline">← تکمیل راه‌اندازی</a>
      {/if}
      <div class="flex-1"></div>
      <!-- Model selector -->
      <div class="relative">
        <button onclick={() => { showModelDropdown = !showModelDropdown; modelSearch = ''; }}
          class="h-8 text-xs px-2 rounded-md border border-input bg-background max-w-44 truncate hover:bg-muted transition-colors"
          title={editingModelLabel}>{editingModelLabel}</button>
        {#if showModelDropdown}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="absolute left-0 top-9 z-50 w-64 rounded-xl border bg-popover shadow-lg" onmouseleave={() => showModelDropdown = false}>
            <div class="p-2 border-b">
              <input type="text" bind:value={modelSearch} placeholder="جستجوی مدل..." dir="rtl"
                class="w-full h-7 text-xs px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"/>
            </div>
            <div class="max-h-52 overflow-y-auto p-1">
              {#each filteredModels as m (m.id)}
                <button onclick={() => changeModel(m.id)}
                  class="w-full text-right text-xs px-2 py-1.5 rounded-md hover:bg-muted transition-colors flex items-center gap-2 {editingModel === m.id ? 'bg-primary/10 font-medium' : ''}">
                  <span class="text-muted-foreground text-[10px] shrink-0">{m.provider || ''}</span>
                  <span class="truncate flex-1">{m.name}</span>
                </button>
              {/each}
              {#if filteredModels.length === 0}<p class="text-xs text-muted-foreground text-center py-3">مدلی پیدا نشد</p>{/if}
            </div>
          </div>
        {/if}
      </div>
      <!-- Export -->
      <div class="relative group">
        <button class="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-input bg-background text-xs hover:bg-muted transition-colors" aria-label="خروجی">
          خروجی <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9 6 21 18 21 18 9"/></svg>
        </button>
        <div class="hidden group-hover:block absolute left-0 top-9 z-20 w-36 bg-popover border rounded-lg shadow-md py-1 text-xs">
          <button onclick={() => handleExport('word')} class="w-full text-right px-3 py-2 hover:bg-muted">Word (.doc)</button>
          <button onclick={() => handleExport('markdown')} class="w-full text-right px-3 py-2 hover:bg-muted">Markdown (.md)</button>
        </div>
      </div>
      <!-- Chat -->
      <button onclick={() => reviewOpen = !reviewOpen}
        class="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-input bg-background text-xs hover:bg-muted transition-colors {reviewOpen ? 'bg-primary/10 border-primary/30 text-primary' : ''}">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        بررسی
      </button>
    </div>

    <!-- Content + review panel -->
    <div class="flex flex-1 min-h-0">
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        {#if loading}
          <div class="flex items-center justify-center flex-1">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        {:else if !selectedChapter}
          <div class="flex flex-col items-center justify-center flex-1 gap-4">
            <p class="text-muted-foreground">یک فصل انتخاب کنید یا فصل جدید بسازید</p>
            <button onclick={() => showNewChapterModal = true}
              class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">فصل جدید</button>
          </div>
        {:else}
          <!-- Action bar -->
          <div class="border-b px-4 py-2 flex items-center gap-2 bg-card/50 shrink-0">
            <span class="text-sm font-medium truncate flex-1">{selectedChapter.title}</span>

            {#if outOfSyncBlocks.length > 0 && !processing}
              <button onclick={reprocessOutOfSync}
                class="inline-flex items-center gap-1 h-7 px-2.5 rounded text-xs bg-amber-500 text-white hover:bg-amber-600 transition-colors">
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                سینک {outOfSyncBlocks.length}
              </button>
            {/if}

            {#if blocks.length > 0 && !processing}
              <button onclick={openStatsPopup}
                class="inline-flex items-center gap-1 h-7 px-2.5 rounded text-xs border border-input bg-background text-muted-foreground hover:bg-muted transition-colors" title="آمار">
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                آمار
              </button>
              <button onclick={confirmReset}
                class="inline-flex items-center gap-1 h-7 px-2.5 rounded text-xs border border-input bg-background text-muted-foreground hover:bg-muted transition-colors">از اول</button>
            {/if}

            <button onclick={() => showDiff = !showDiff}
              class="inline-flex items-center gap-1 h-7 px-2.5 rounded text-xs border border-input bg-background hover:bg-muted transition-colors {showDiff ? 'text-primary border-primary/30 bg-primary/5' : 'text-muted-foreground'}">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M9 4h6"/><path d="M9 20h6"/><path d="M3 12h2"/><path d="M19 12h2"/></svg>
              {showDiff ? 'diff روشن' : 'diff خاموش'}
            </button>

            <button onclick={openPromptEditor}
              class="inline-flex items-center gap-1 h-7 px-2.5 rounded text-xs border border-input bg-background text-muted-foreground hover:bg-muted transition-colors">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              پرامپت
            </button>

            {#if processing}
              <button onclick={stopProcessing}
                class="inline-flex items-center gap-1 h-7 px-2.5 rounded text-xs bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 transition-colors">توقف</button>
            {:else}
              <button onclick={processAllBlocks} disabled={blocks.length === 0 || blocks.every(b => !b.content.trim())}
                class="inline-flex items-center gap-1.5 h-7 px-3 rounded text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                پردازش همه
              </button>
            {/if}
          </div>

          <!-- Progress bar -->
          {#if processing}
            <div class="px-4 py-2 border-b bg-muted/20 shrink-0">
              <div class="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>در حال پردازش بند {processingIndex + 1} از {blocks.length}...</span>
                <span>{processProgress}٪</span>
              </div>
              <div class="h-1.5 rounded-full bg-muted overflow-hidden">
                <div class="h-full rounded-full bg-primary transition-all duration-300" style="width: {processProgress}%"></div>
              </div>
            </div>
          {/if}

          <!-- Side-by-side block editor -->
          <div class="flex-1 grid grid-cols-2 overflow-hidden">

            <!-- Source column (right): BlockEditor -->
            <div class="border-l flex flex-col overflow-hidden">
              <div class="px-3 py-1.5 border-b bg-muted/30 sticky top-0 z-10 shrink-0">
                <span class="text-xs font-medium text-muted-foreground">متن اصلی</span>
              </div>
              <div bind:this={sourceScrollEl} onscroll={onSourceScroll} class="flex-1 overflow-y-auto p-3">
                <BlockEditor
                  bind:blocks
                  readonly={processing}
                  onChange={onBlocksChange}
                  hoveredBlockId={hoveredBlockId}
                  onHover={(id) => hoveredBlockId = id}
                />
              </div>
            </div>

            <!-- Output column (left) -->
            <div class="flex flex-col overflow-hidden">
              <div class="px-3 py-1.5 border-b bg-muted/30 sticky top-0 z-10 shrink-0">
                <span class="text-xs font-medium text-muted-foreground">ویرایش‌شده</span>
              </div>
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                bind:this={outputScrollEl}
                onscroll={onOutputScroll}
                class="flex-1 overflow-y-auto p-3 space-y-1"
                onmouseup={(e) => {
                  const sel = window.getSelection();
                  const text = sel?.toString().trim() ?? '';
                  if (text.length > 3) {
                    selectionPopup = { x: /** @type {MouseEvent} */ (e).clientX, y: /** @type {MouseEvent} */ (e).clientY - 36, text };
                  } else {
                    selectionPopup = null;
                  }
                }}
                onmouseleave={() => { if (selectionPopup && !window.getSelection()?.toString().trim()) selectionPopup = null; }}
              >
                {#each blocks as block, idx (block.id)}
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div
                    class="group/out relative rounded-lg px-1 py-0.5 transition-colors min-h-[1.5rem]
                      {hoveredBlockId === block.id ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/20'}
                      {block.outOfSync ? 'opacity-50' : ''}"
                    onmouseenter={() => hoveredBlockId = block.id}
                    onmouseleave={() => hoveredBlockId = ''}
                  >
                    {#if processing && processingIndex === idx && !block.outputText}
                      <div class="space-y-1.5 py-1">
                        <div class="h-3 bg-muted animate-pulse rounded w-4/5"></div>
                        <div class="h-3 bg-muted animate-pulse rounded w-3/5"></div>
                        <div class="h-3 bg-muted animate-pulse rounded w-4/5"></div>
                      </div>
                    {:else if block.outOfSync}
                      <div class="flex items-center justify-between">
                        <span class="text-xs text-amber-600 dark:text-amber-400 italic">منتظر سینک...</span>
                        {#if !processing}
                          <button onclick={() => reprocessSingleBlock(block)}
                            class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 transition-colors">
                            سینک این بند
                          </button>
                        {/if}
                      </div>
                    {:else if block.outputText}
                      <!-- Inline edit mode for output block -->
                      {#if block._editing}
                        <div class="flex items-center gap-1.5 mb-1">
                          <button onclick={async () => {
                              const idx2 = blocks.findIndex(b => b.id === block.id);
                              blocks[idx2] = { ...blocks[idx2], status: 'edited', editedText: block._editVal ?? block.outputText, _editing: false, _editVal: undefined };
                              blocks = [...blocks];
                              await saveBlocks();
                            }}
                            class="h-6 px-2.5 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors">ذخیره</button>
                          <button onclick={() => {
                              const idx2 = blocks.findIndex(b => b.id === block.id);
                              blocks[idx2] = { ...blocks[idx2], _editing: false, _editVal: undefined };
                              blocks = [...blocks];
                            }}
                            class="h-6 px-2.5 rounded border border-input bg-background text-xs hover:bg-muted transition-colors">لغو</button>
                        </div>
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div
                          contenteditable="true"
                          dir="auto"
                          class="text-sm leading-relaxed whitespace-pre-wrap outline-none min-h-[2rem] caret-primary"
                          oninput={(e) => {
                            const idx2 = blocks.findIndex(b => b.id === block.id);
                            blocks[idx2] = { ...blocks[idx2], _editVal: /** @type {any} */ (e.target)?.textContent ?? '' };
                          }}
                        >{block.status === 'edited' ? (block.editedText ?? block.outputText) : block.outputText}</div>
                      {:else}
                        <!-- Edit pencil on hover -->
                        {#if !processing}
                          <button onclick={() => {
                              const idx2 = blocks.findIndex(b => b.id === block.id);
                              blocks[idx2] = { ...blocks[idx2], _editing: true, _editVal: block.status === 'edited' ? (block.editedText ?? block.outputText) : block.outputText };
                              blocks = [...blocks];
                            }}
                            class="absolute top-1 left-1 p-1 rounded opacity-0 group-hover/out:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="ویرایش (یا دابل‌کلیک)" aria-label="ویرایش خروجی">
                            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          </button>
                          <!-- Re-process this block -->
                          <button onclick={() => reprocessSingleBlock(block)}
                            class="absolute top-1 left-7 p-1 rounded opacity-0 group-hover/out:opacity-100 transition-opacity text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="پردازش مجدد این بند" aria-label="پردازش مجدد">
                            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                          </button>
                        {/if}
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div ondblclick={() => {
                            if (processing) return;
                            const idx2 = blocks.findIndex(b => b.id === block.id);
                            blocks[idx2] = { ...blocks[idx2], _editing: true, _editVal: block.status === 'edited' ? (block.editedText ?? block.outputText) : block.outputText };
                            blocks = [...blocks];
                          }}>
                          {#if block.status === 'edited'}
                            <p class="text-sm leading-relaxed whitespace-pre-wrap" dir="auto">{block.editedText ?? block.outputText}</p>
                          {:else if showDiff}
                            <DiffView source={block.content} output={block.outputText} side="output" />
                          {:else}
                            <p class="text-sm leading-relaxed whitespace-pre-wrap" dir="auto">{block.outputText}</p>
                          {/if}
                        </div>
                      {/if}
                    {:else if !processing}
                      <p class="text-xs text-muted-foreground italic">—</p>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Review panel -->
      {#if reviewOpen && selectedChapter}
        <div class="w-80 shrink-0 border-r">
          <ReviewPanel
            chapterId={selectedChapter.id}
            {projectId}
            operationType="editorial"
            sourceText={selectedChapter.sourceText || ''}
            outputText={computeFinalOutput()}
            apiKey={settings?.openRouterApiKey || ''}
            defaultModel={reviewModel}
            bind:quote={reviewQuote}
            onClose={() => reviewOpen = false}
          />
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Selection → Add to chat popup -->
{#if selectionPopup}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed z-50 rounded-lg border bg-popover shadow-lg px-2 py-1 flex items-center gap-1"
    style="top: {selectionPopup.y}px; left: {selectionPopup.x}px; transform: translateX(-50%);"
    onmouseleave={() => selectionPopup = null}
  >
    <button
      onclick={() => {
        if (!selectionPopup) return;
        reviewQuote = `> «${selectionPopup.text}»\n\n`;
        reviewOpen = true;
        selectionPopup = null;
        window.getSelection()?.removeAllRanges();
      }}
      class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-muted transition-colors"
    >
      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      اضافه به چت
    </button>
  </div>
{/if}

<!-- Confirm Reset Dialog -->
{#if showResetConfirm}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => showResetConfirm = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-card border rounded-xl p-6 w-80 mx-4 shadow-xl" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-base font-semibold mb-2" dir="rtl">از اول شروع کنیم؟</h3>
      <p class="text-sm text-muted-foreground mb-5" dir="rtl">همه خروجی‌های AI پاک می‌شوند. متن اصلی بلاک‌ها حفظ می‌شود.</p>
      <div class="flex gap-2 justify-end" dir="rtl">
        <button onclick={() => showResetConfirm = false} class="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors">انصراف</button>
        <button onclick={doReset} class="h-9 px-4 rounded-md bg-destructive text-destructive-foreground text-sm hover:bg-destructive/90 transition-colors">بله، از اول</button>
      </div>
    </div>
  </div>
{/if}

<!-- Prompt Editor -->
{#if showPromptEditor}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => showPromptEditor = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-card border rounded-xl p-5 w-full max-w-2xl mx-4 shadow-xl flex flex-col gap-3" onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold" dir="rtl">ویرایش پرامپت</h3>
        {#if processing}<span class="text-xs text-amber-600 px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/30">از بند بعدی اعمال می‌شود</span>{/if}
      </div>
      <textarea bind:value={promptEditorValue} rows={12} dir="ltr"
        class="w-full text-sm p-3 rounded-md border border-input bg-background resize-none font-mono focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"></textarea>
      <div class="flex gap-2 justify-end" dir="rtl">
        <button onclick={() => showPromptEditor = false} class="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors">انصراف</button>
        <button onclick={savePrompt} class="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">ذخیره</button>
      </div>
    </div>
  </div>
{/if}

<!-- Stats -->
{#if showStats}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => showStats = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-card border rounded-xl p-5 w-80 mx-4 shadow-xl" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-base font-semibold mb-4" dir="rtl">آمار فصل</h3>
      <div class="space-y-1.5 text-sm" dir="rtl">
        <div class="flex justify-between"><span class="text-muted-foreground">تعداد بلاک‌ها</span><span class="font-medium">{stats.total}</span></div>
        <div class="flex justify-between"><span class="text-muted-foreground">پردازش‌شده</span><span class="font-medium text-green-600 dark:text-green-400">{stats.done}</span></div>
        <div class="flex justify-between"><span class="text-muted-foreground">ویرایش دستی</span><span class="font-medium text-blue-600 dark:text-blue-400">{stats.edited}</span></div>
        <div class="flex justify-between"><span class="text-muted-foreground">خارج از سینک</span><span class="font-medium {stats.outOfSync > 0 ? 'text-amber-600 dark:text-amber-400' : ''}">{stats.outOfSync}</span></div>

        <div class="border-t pt-2 mt-1">
          <div class="text-xs font-medium text-muted-foreground mb-1">اصلاحات AI</div>
          <div class="flex justify-between"><span class="text-muted-foreground">تغییر کلمه/عبارت</span><span class="font-medium text-primary">{stats.editStats.wordChanges.toLocaleString()}</span></div>
          <div class="flex justify-between mt-0.5"><span class="text-muted-foreground">اصلاح فاصله/نیم‌فاصله</span><span class="font-medium text-primary">{stats.editStats.wsChanges.toLocaleString()}</span></div>
          <div class="flex justify-between mt-0.5"><span class="text-muted-foreground">دفعات پردازش</span><span class="font-medium">{stats.editStats.runs}</span></div>
        </div>

        <div class="border-t pt-2 mt-1">
          <div class="text-xs font-medium text-muted-foreground mb-1">هزینه (OpenRouter)</div>
          {#if chapterCostStats}
            <div class="flex justify-between"><span class="text-muted-foreground">هزینه این فصل</span><span class="font-medium text-green-700 dark:text-green-400">${chapterCostStats.totalCost.toFixed(6)}</span></div>
            <div class="flex justify-between mt-0.5"><span class="text-muted-foreground">توکن واقعی</span><span class="font-medium">{chapterCostStats.totalTokens.toLocaleString()}</span></div>
            <div class="flex justify-between mt-0.5"><span class="text-muted-foreground">تعداد درخواست</span><span class="font-medium">{chapterCostStats.requests}</span></div>
          {:else}
            <div class="flex justify-between">
              <span class="text-muted-foreground">توکن ورودی (~)</span><span class="font-medium">{stats.approxInputTokens.toLocaleString()}</span>
            </div>
            <div class="flex justify-between mt-0.5">
              <span class="text-muted-foreground">توکن خروجی (~)</span><span class="font-medium">{stats.approxOutputTokens.toLocaleString()}</span>
            </div>
            <p class="text-xs text-muted-foreground mt-1">داده دقیق هزینه پس از اولین پردازش ثبت می‌شود.</p>
          {/if}
        </div>
      </div>
      <button onclick={() => showStats = false} class="mt-4 w-full h-9 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors">بستن</button>
    </div>
  </div>
{/if}

<!-- New Chapter Modal -->
{#if showNewChapterModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => showNewChapterModal = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-card border rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-lg font-semibold mb-4" dir="rtl">فصل جدید</h3>
      <div class="space-y-3" dir="rtl">
        <input type="text" bind:value={newChapterTitle} placeholder="عنوان فصل"
          class="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"/>
      </div>
      <div class="flex gap-2 justify-end mt-4" dir="rtl">
        <button onclick={() => showNewChapterModal = false} class="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors">انصراف</button>
        <button onclick={addChapter} disabled={!newChapterTitle.trim()}
          class="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-40 transition-colors">ایجاد</button>
      </div>
    </div>
  </div>
{/if}
