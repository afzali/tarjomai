<script>
  import { page } from '$app/stores';
  import { onMount, onDestroy, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentProjectStore } from '$lib/stores/currentProject.store.js';
  import projectsService from '$lib/services/projects.service.js';
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

  // Translation state
  let translating = $state(false);
  /** @type {AbortController | null} */
  let abortController = $state(null);
  let totalSentences = $state(0);
  let doneSentences = $state(0);
  let currentSentenceText = $state('');

  // Block-based state — each block is one paragraph
  /**
   * @typedef {{ id: string, source: string, translation: string, status: 'pending'|'translating'|'done'|'error' }} SentenceItem
   * @typedef {{ id: string, type: string, content: string, sentences?: SentenceItem[], translation?: string, editedTranslation?: string|null, status?: string, outOfSync?: boolean, _editing?: boolean, _editVal?: string, originalContent?: string, originalTranslation?: string }} Block
   */
  /** @type {Block[]} */
  let blocks = $state([]);

  // Hover sync between columns
  let hoveredBlockId = $state('');
  let hoveredSentenceIndex = $state(-1);

  // Scroll sync between source and translation columns
  /** @type {HTMLElement | null} */
  let sourceScrollEl = $state(null);
  /** @type {HTMLElement | null} */
  let translationScrollEl = $state(null);
  let _syncingScroll = $state(false);

  function onSourceScroll() {
    if (_syncingScroll || !translationScrollEl || !sourceScrollEl) return;
    _syncingScroll = true;
    const ratio = sourceScrollEl.scrollTop / (sourceScrollEl.scrollHeight - sourceScrollEl.clientHeight || 1);
    translationScrollEl.scrollTop = ratio * (translationScrollEl.scrollHeight - translationScrollEl.clientHeight);
    requestAnimationFrame(() => { _syncingScroll = false; });
  }

  function onTranslationScroll() {
    if (_syncingScroll || !sourceScrollEl || !translationScrollEl) return;
    _syncingScroll = true;
    const ratio = translationScrollEl.scrollTop / (translationScrollEl.scrollHeight - translationScrollEl.clientHeight || 1);
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

  // Model for translation
  let translationModel = $state('');
  let reviewModel = $state('anthropic/claude-sonnet-4');
  let availableModels = $state(allModels);
  let modelSearch = $state('');
  let showModelDropdown = $state(false);

  // Show/hide diff highlights
  let showDiff = $state(true);

  // Stats popup
  let showStats = $state(false);
  /** @type {{ totalCost: number, totalTokens: number, requests: number } | null} */
  let chapterCostStats = $state(null);

  // Progress
  const translationProgressPercent = $derived(
    totalSentences > 0 ? Math.round((doneSentences / totalSentences) * 100) : 0
  );

  const outOfSyncBlocks = $derived(blocks.filter(b => b.outOfSync));

  const stats = $derived.by(() => {
    const total = blocks.length;
    const edited = blocks.filter(b => b.status === 'edited').length;
    const outOfSync = blocks.filter(b => b.outOfSync).length;
    const done = blocks.filter(b => b.sentences?.some(s => s.status === 'done') && !b.outOfSync).length;
    const inputChars = blocks.reduce((a, b) => a + (b.content?.length || 0), 0);
    const outputChars = blocks.reduce((a, b) => a + blockTranslationText(b).length, 0);
    const approxInputTokens = Math.round(inputChars / 4);
    const approxOutputTokens = Math.round(outputChars / 4);
    return { total, edited, outOfSync, done, approxInputTokens, approxOutputTokens };
  });

  const isSetupIncomplete = $derived(
    project && project.setupStep && project.setupStep !== 'completed'
  );

  // Setup step labels for navigation
  const setupStepLabels = {
    'created': 'شروع ویزارد',
    'analyze': 'ادامه تحلیل سبک',
    'compare': 'ادامه مقایسه مدل‌ها',
    'judge': 'ادامه داوری',
    'quick-setup': 'ادامه تنظیم سریع'
  };

  onMount(async () => {
    settings = await settingsStore.load();
    const loaded = await currentProjectStore.load(projectId);
    if (!loaded) { goto('/'); return; }

    project = loaded.project;
    chapters = loaded.chapters;
    config = loaded.config;

    // Redirect if wrong operation type
    if (project.operationType !== 'translation') {
      goto(`/projects/${projectId}`);
      return;
    }

    // Set default model
    if (project.defaultModel) {
      translationModel = project.defaultModel;
      reviewModel = project.chatModel || project.defaultModel;
    } else if (settings?.defaultModels?.translation) {
      translationModel = settings.defaultModels.translation;
      reviewModel = settings.defaultModels?.review || settings.defaultModels.translation;
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

  /** Build SentenceItem[] for a block from its content + existing translation */
  function makeSentences(/** @type {string} */ content, /** @type {string|undefined} */ translation) {
    const srcSents = splitSentences(content);
    const tgtSents = translation ? splitSentences(translation) : [];
    return srcSents.map((src, i) => (/** @type {SentenceItem} */ ({
      id: uid(),
      source: src,
      translation: tgtSents[i] || '',
      status: tgtSents[i] ? 'done' : 'pending'
    })));
  }

  /** Migrate old sourceText string → blocks array */
  function migrateToBlocks(/** @type {any} */ chapter) {
    if (chapter.blocks && chapter.blocks.length > 0) {
      return chapter.blocks.map((/** @type {any} */ b) => ({
        ...b,
        sentences: b.sentences || makeSentences(b.content, b.translation)
      }));
    }
    const src = chapter.sourceText || '';
    if (!src.trim()) return [/** @type {Block} */ ({ id: uid(), type: 'paragraph', content: '', status: 'pending', sentences: [] })];
    return src.split(/\n{2,}/).map((/** @type {string} */ p) => {
      const content = p.trim();
      return /** @type {Block} */ ({ id: uid(), type: 'paragraph', content, status: 'pending', sentences: makeSentences(content, '') });
    }).filter((/** @type {any} */ b) => b.content);
  }

  /** Split text into sentences — each sentence keeps its trailing punctuation */
  function splitSentences(/** @type {string} */ text) {
    if (!text?.trim()) return [];
    // Split after sentence-ending punctuation (keep delimiter with previous token)
    const parts = text.split(/(?<=[.!?؟\.!?])(\s+|$)/).filter(s => s && s.trim());
    // Re-join punctuation fragments
    /** @type {string[]} */
    const result = [];
    for (const p of parts) {
      if (/^\s+$/.test(p)) continue;
      if (result.length && /^[.!?؟]/.test(p)) {
        result[result.length - 1] += p;
      } else {
        result.push(p.trim());
      }
    }
    return result.filter(Boolean);
  }

  function selectChapter(/** @type {any} */ chapter) {
    selectedChapter = chapter;
    blocks = migrateToBlocks(chapter);
    doneSentences = 0;
    totalSentences = 0;
  }

  /** Flatten sentences array → full paragraph translation string */
  function blockTranslationText(/** @type {Block} */ b) {
    if (b.status === 'edited') return b.editedTranslation || '';
    if (b.sentences?.length) return b.sentences.map(s => s.translation).filter(Boolean).join(' ');
    return b.translation || '';
  }

  /**
   * Save a snapshot of original content and translation after translation completes.
   * @param {Block} b
   * @returns {Block}
   */
  function saveSnapshot(b) {
    const currentContent = b.content;
    const currentTranslation = blockTranslationText(b);
    // Only save if we don't already have a snapshot or if content has changed significantly
    if (!b.originalContent || b.originalContent !== currentContent || !b.originalTranslation) {
      return { ...b, originalContent: currentContent, originalTranslation: currentTranslation };
    }
    return b;
  }

  /**
   * Check if content or translation has been modified since last snapshot.
   * @param {Block} b
   * @returns {{ contentChanged: boolean, translationChanged: boolean, hasChanges: boolean }}
   */
  function checkModifications(b) {
    const contentChanged = b.originalContent !== undefined ? b.content !== b.originalContent : false;
    const translationChanged = b.originalTranslation !== undefined ? blockTranslationText(b) !== b.originalTranslation : false;
    return { contentChanged, translationChanged, hasChanges: contentChanged || translationChanged };
  }

  /**
   * Compute word-level diff between two strings using LCS.
   * Returns an array of segments: { type: 'equal'|'insert'|'delete', text: string }
   * @param {string} oldText
   * @param {string} newText
   */
  function wordDiff(oldText, newText) {
    const tokenize = (/** @type {string} */ s) => (s || '').split(/(\s+)/).filter(t => t.length > 0);
    const a = tokenize(oldText || '');
    const b = tokenize(newText || '');
    const n = a.length, m = b.length;
    // LCS table
    /** @type {number[][]} */
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    /** @type {{type:'equal'|'insert'|'delete', text:string}[]} */
    const out = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { out.push({ type: 'equal', text: a[i] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: 'delete', text: a[i] }); i++; }
      else { out.push({ type: 'insert', text: b[j] }); j++; }
    }
    while (i < n) { out.push({ type: 'delete', text: a[i++] }); }
    while (j < m) { out.push({ type: 'insert', text: b[j++] }); }
    // Merge adjacent same-type segments
    /** @type {{type:'equal'|'insert'|'delete', text:string}[]} */
    const merged = [];
    for (const seg of out) {
      const last = merged[merged.length - 1];
      if (last && last.type === seg.type) last.text += seg.text;
      else merged.push({ ...seg });
    }
    return merged;
  }

  async function saveBlocks() {
    if (!selectedChapter) return;
    const finalOutput = blocks.map(b => blockTranslationText(b)).join('\n\n');
    await currentProjectStore.updateChapter(selectedChapter.id, {
      blocks,
      outputText: finalOutput,
      translatedText: finalOutput,
      status: blocks.some(b => b.sentences?.some(s => s.status === 'done')) ? 'completed' : 'pending'
    });
  }

  /** Called by BlockEditor when user edits source blocks (on blur/paste/Enter only).
   * IMPORTANT: Because BlockEditor uses bind:blocks, the `blocks` state is already
   * synced with newBlocks by the time this runs. We only mutate if we need to add
   * metadata (outOfSync, sentences). Otherwise we do nothing to avoid unnecessary re-renders.
   */
  async function onBlocksChange(/** @type {Block[]} */ newBlocks) {
    let hasChanges = false;
    const updated = newBlocks.map((nb) => {
      const hadTranslation = (nb.sentences?.some(s => s.status === 'done')) || !!nb.editedTranslation;
      const contentDrifted = nb.originalContent !== undefined && nb.content !== nb.originalContent;

      // Mark outOfSync when source drifts from snapshot
      if (hadTranslation && contentDrifted && !nb.outOfSync) {
        hasChanges = true;
        return { ...nb, outOfSync: true };
      }
      // Clear outOfSync if content matches snapshot again
      if (hadTranslation && !contentDrifted && nb.outOfSync) {
        hasChanges = true;
        return { ...nb, outOfSync: false };
      }
      // New block has no sentences array - initialize it
      if (!nb.sentences) {
        hasChanges = true;
        return { ...nb, sentences: makeSentences(nb.content, '') };
      }
      return nb;
    });
    // Only reassign and save if we actually made changes - avoids spurious re-renders
    if (hasChanges) {
      blocks = updated;
      await saveBlocks();
    }
  }

  function stopTranslation() { abortController?.abort(); }

  async function translateAllBlocks() {
    if (!selectedChapter || !settings?.openRouterApiKey || !translationModel) return;
    // Reset all blocks
    blocks = blocks.map(b => ({
      ...b, status: 'pending', editedTranslation: null, outOfSync: false,
      sentences: makeSentences(b.content, '')
    }));
    await runTranslation(blocks);
  }

  async function retranslateOutOfSync() {
    if (!selectedChapter || !settings?.openRouterApiKey || !translationModel) return;
    const toTranslate = blocks.filter(b => b.outOfSync);
    await runTranslation(toTranslate);
    // After successful retranslation, update snapshot to new baseline
    blocks = blocks.map(b => b.outOfSync ? saveSnapshot({ ...b, outOfSync: false }) : b);
    await saveBlocks();
  }

  /** @param {Block} block */
  async function retranslateSingleBlock(block) {
    if (!selectedChapter || !settings?.openRouterApiKey || !translationModel) return;
    // Reset block sentences
    const idx = blocks.findIndex(b => b.id === block.id);
    if (idx !== -1) {
      blocks[idx] = { ...blocks[idx], outOfSync: false, sentences: makeSentences(block.content, '') };
      blocks = [...blocks];
    }
    await runTranslation([blocks[idx] ?? block]);
  }

  /**
   * @param {Block[]} targetBlocks
   */
  async function runTranslation(targetBlocks) {
    translating = true;
    abortController = new AbortController();
    const signal = abortController.signal;

    // Count total sentences
    const allSentences = targetBlocks.flatMap(b =>
      (b.sentences || makeSentences(b.content, '')).filter(s => s.source.trim() && s.status !== 'done')
    );
    totalSentences = allSentences.length;
    doneSentences = 0;

    try {
      for (const block of targetBlocks) {
        if (signal.aborted) break;
        const blockIdx = blocks.findIndex(b => b.id === block.id);
        if (blockIdx === -1) continue;

        const sentences = blocks[blockIdx].sentences || makeSentences(block.content, '');
        // Update sentences reactively so UI shows block as translating
        blocks[blockIdx] = { ...blocks[blockIdx], sentences: [...sentences] };
        blocks = [...blocks];

        for (let si = 0; si < sentences.length; si++) {
          if (signal.aborted) break;
          const sent = sentences[si];
          if (!sent.source.trim()) continue;

          // Mark sentence as translating
          sentences[si] = { ...sent, status: 'translating' };
          blocks[blockIdx] = { ...blocks[blockIdx], sentences: [...sentences] };
          blocks = [...blocks];
          currentSentenceText = sent.source;
          await tick();

          try {
            const prompt = buildTranslationPrompt(sent.source);
            const result = await openrouterService.sendMessage(
              settings.openRouterApiKey,
              translationModel,
              [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }],
              { signal, projectId, chapterId: selectedChapter?.id }
            );
            sentences[si] = { ...sentences[si], translation: (result.content || '').trim(), status: 'done' };
            doneSentences += 1;
          } catch (/** @type {any} */ err) {
            if (err?.name === 'AbortError') break;
            sentences[si] = { ...sentences[si], status: 'error' };
          }

          blocks[blockIdx] = { ...blocks[blockIdx], sentences: [...sentences] };
          blocks = [...blocks];
        }

        if (!signal.aborted) {
          blocks[blockIdx] = { ...blocks[blockIdx], status: 'pending', outOfSync: false, sentences: [...sentences] };
          blocks = [...blocks];
          await saveBlocks();
        }
      }
    } finally {
      translating = false;
      currentSentenceText = '';
      abortController = null;
      // Save snapshot of completed translations
      blocks = blocks.map(b => saveSnapshot(b));
      await saveBlocks();
    }
  }

  function buildTranslationPrompt(/** @type {string} */ sourceText) {
    const srcLang = project?.sourceLanguage || 'English';
    const tgtLang = project?.targetLanguage || 'Persian';
    const rules = config?.systemPrompt || '';
    const system = `You are a professional translator. Translate from ${srcLang} to ${tgtLang}.
Rules:
- Output ONLY the translated text. No explanations, no notes, no prefixes.
- Preserve the sentence structure and meaning.
- Do not add any extra sentences or commentary.${rules ? `\n${rules}` : ''}`;
    return {
      system,
      user: sourceText
    };
  }

  async function openStatsPopup() {
    if (selectedChapter) {
      chapterCostStats = await usageService.getChapterStats(selectedChapter.id);
    }
    showStats = true;
  }

  function handleChatAbout(/** @type {string} */ text) {
    reviewQuote = `> "${text}"\n\n`;
    reviewOpen = true;
  }

  function handleExport(/** @type {string} */ format) {
    if (!project || !chapters.length) return;
    if (format === 'word') {
      exportUtils.exportToWord(project, chapters, { outputLabel: 'ترجمه' });
    } else if (format === 'markdown') {
      const md = exportUtils.exportToMarkdown(project, chapters, { outputLabel: 'ترجمه' });
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      exportUtils.downloadFile(blob, `${project.title}.md`);
    }
  }

  async function changeModel(/** @type {string} */ modelId) {
    translationModel = modelId;
    reviewModel = modelId;
    showModelDropdown = false;
    await projectsService.updateProject(projectId, { defaultModel: modelId, chatModel: modelId });
    if (project) project = { ...project, defaultModel: modelId, chatModel: modelId };
  }

  const translationModelLabel = $derived(
    availableModels.find(m => m.id === translationModel)?.name || translationModel
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
    blocks = blocks.map(b => ({ ...b, translation: '', status: 'pending', editedTranslation: null, outOfSync: false, sentences: makeSentences(b.content, '') }));
    await saveBlocks();
    showResetConfirm = false;
  }

  function computeFinalOutput() {
    return blocks.map(b => blockTranslationText(b)).join('\n\n');
  }

  /** Count sentences in a block with errors */
  function blockErrorCount(/** @type {Block} */ block) {
    return block.sentences?.filter(s => s.status === 'error').length || 0;
  }

  /** Retry a single errored sentence in a block */
  async function retryBlockErrors(/** @type {Block} */ block) {
    const blockIdx = blocks.findIndex(b => b.id === block.id);
    if (blockIdx === -1 || !settings?.openRouterApiKey) return;
    const sentences = [...(blocks[blockIdx].sentences || [])];
    const errored = sentences.filter(s => s.status === 'error');
    if (!errored.length) return;
    translating = true;
    abortController = new AbortController();
    const signal = abortController.signal;
    totalSentences = errored.length; doneSentences = 0;
    try {
      for (let si = 0; si < sentences.length; si++) {
        if (signal.aborted || sentences[si].status !== 'error') continue;
        sentences[si] = { ...sentences[si], status: 'translating' };
        blocks[blockIdx] = { ...blocks[blockIdx], sentences: [...sentences] };
        blocks = [...blocks];
        try {
          const prompt = buildTranslationPrompt(sentences[si].source);
          const result = await openrouterService.sendMessage(
            settings.openRouterApiKey, translationModel,
            [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }],
            { signal, projectId, chapterId: selectedChapter?.id }
          );
          sentences[si] = { ...sentences[si], translation: (result.content || '').trim(), status: 'done' };
          doneSentences += 1;
        } catch (/** @type {any} */ e) {
          if (e?.name === 'AbortError') break;
          sentences[si] = { ...sentences[si], status: 'error' };
        }
        blocks[blockIdx] = { ...blocks[blockIdx], sentences: [...sentences] };
        blocks = [...blocks];
      }
    } finally {
      translating = false; abortController = null;
      await saveBlocks();
    }
  }

  function getContinueSetupUrl() {
    if (!project?.setupStep || project.setupStep === 'completed') return null;
    return projectsService.getSetupStepUrl(project.id, project.setupStep);
  }

  function getContinueSetupLabel() {
    if (!project?.setupStep) return 'شروع ویزارد';
    return setupStepLabels[/** @type {keyof typeof setupStepLabels} */ (project.setupStep)] || 'ادامه ویزارد';
  }

  async function skipSetup() {
    if (project) {
      await projectsService.updateSetupStep(project.id, 'completed');
      project = await projectsService.getProject(project.id);
    }
  }
</script>

<div class="flex h-screen overflow-hidden bg-background" dir="rtl">
  <!-- Sidebar -->
  <div class="w-60 shrink-0 border-l flex flex-col bg-card">
    <div class="p-3 border-b">
      <a href="/" class="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors min-w-0">
        <FileTypeIcon operationType="translation" size="sm" showExtension={false} />
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
    <div class="p-2 border-t space-y-1">
      <button onclick={() => showNewChapterModal = true}
        class="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        فصل جدید
      </button>
      <a href="/projects/{projectId}/rules" 
        class="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs border border-input bg-background hover:bg-muted transition-colors">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.83 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>
        قوانین ترجمه
      </a>
    </div>
  </div>

  <!-- Main area -->
  <div class="flex-1 flex flex-col min-w-0">
    <!-- Top bar -->
    <div class="border-b bg-card px-4 py-2 flex items-center gap-2 flex-wrap">
      {#if isSetupIncomplete}
        <a href={getContinueSetupUrl()} class="text-xs text-amber-600 hover:underline">← {getContinueSetupLabel()}</a>
        <button onclick={skipSetup} class="text-xs text-muted-foreground hover:text-foreground">رد شدن</button>
      {/if}
      <div class="flex-1"></div>
      
      <!-- Model selector -->
      <div class="relative">
        <button onclick={() => { showModelDropdown = !showModelDropdown; modelSearch = ''; }}
          class="h-8 text-xs px-2 rounded-md border border-input bg-background max-w-44 truncate hover:bg-muted transition-colors"
          title={translationModelLabel}>{translationModelLabel || 'انتخاب مدل'}</button>
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
                  class="w-full text-right text-xs px-2 py-1.5 rounded-md hover:bg-muted transition-colors flex items-center gap-2 {translationModel === m.id ? 'bg-primary/10 font-medium' : ''}">
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
      <div class="relative group/menu">
        <button class="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-input bg-background text-xs hover:bg-muted transition-colors" aria-label="خروجی">
          خروجی <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9 6 21 18 21 18 9"/></svg>
        </button>
        <!-- Bridge element to prevent menu from closing when moving mouse from button to menu -->
        <div class="hidden group-hover/menu:block absolute left-0 top-full w-full h-1"></div>
        <div class="hidden group-hover/menu:block absolute left-0 top-[calc(100%+4px)] z-20 w-36 bg-popover border rounded-lg shadow-md py-1 text-xs">
          <button onclick={() => handleExport('word')} class="w-full text-right px-3 py-2 hover:bg-muted">Word (.doc)</button>
          <button onclick={() => handleExport('markdown')} class="w-full text-right px-3 py-2 hover:bg-muted">Markdown (.md)</button>
        </div>
      </div>
      
      <!-- Chat/Review -->
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

            {#if outOfSyncBlocks.length > 0 && !translating}
              <button onclick={retranslateOutOfSync}
                class="inline-flex items-center gap-1 h-7 px-2.5 rounded text-xs bg-amber-500 text-white hover:bg-amber-600 transition-colors">
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                سینک {outOfSyncBlocks.length}
              </button>
            {/if}

            {#if blocks.length > 0 && !translating}
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

            {#if translating}
              <button onclick={stopTranslation}
                class="inline-flex items-center gap-1 h-7 px-2.5 rounded text-xs bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 transition-colors">توقف</button>
            {:else}
              <button onclick={translateAllBlocks} disabled={blocks.length === 0 || blocks.every(b => !b.content.trim()) || !translationModel}
                class="inline-flex items-center gap-1.5 h-7 px-3 rounded text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                ترجمه همه
              </button>
            {/if}
          </div>

          <!-- Progress bar -->
          {#if translating}
            <div class="px-4 py-2 border-b bg-muted/20 shrink-0">
              <div class="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span class="truncate max-w-xs" title={currentSentenceText}>
                  {doneSentences}/{totalSentences} جمله
                  {#if currentSentenceText} — <span class="italic opacity-70 truncate">{currentSentenceText.slice(0, 40)}{currentSentenceText.length > 40 ? '…' : ''}</span>{/if}
                </span>
                <span class="shrink-0">{translationProgressPercent}٪</span>
              </div>
              <div class="h-1.5 rounded-full bg-muted overflow-hidden">
                <div class="h-full rounded-full bg-primary transition-all duration-300" style="width: {translationProgressPercent}%"></div>
              </div>
            </div>
          {/if}

          <!-- Side-by-side editor -->
          <div class="flex-1 grid grid-cols-2 overflow-hidden">

            <!-- Source column (right): BlockEditor -->
            <div class="border-l flex flex-col overflow-hidden">
              <div class="px-3 py-1.5 border-b bg-muted/30 sticky top-0 z-10 shrink-0">
                <span class="text-xs font-medium text-muted-foreground">متن اصلی ({project?.sourceLanguage || '...'})</span>
              </div>
              <div bind:this={sourceScrollEl} onscroll={onSourceScroll} class="flex-1 overflow-y-auto p-3">
                {#if showDiff}
                  <!-- In diff mode: show read-only view with sentence-level hover sync -->
                  <div class="space-y-3">
                    {#each blocks as block (block.id)}
                      {@const contentChanged = block.originalContent !== undefined && block.content !== block.originalContent}
                      {@const srcSents = splitSentences(block.content)}
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <div
                        class="rounded-lg px-2 py-1.5 transition-colors {hoveredBlockId === block.id ? 'bg-muted/40 ring-1 ring-primary/15' : ''}"
                        onmouseenter={() => hoveredBlockId = block.id}
                        onmouseleave={() => { hoveredBlockId = ''; hoveredSentenceIndex = -1; }}
                      >
                        {#if contentChanged}
                          <div class="text-[10px] text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1">
                            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>
                            تفاوت با آخرین نسخه ترجمه‌شده
                          </div>
                          <p class="text-sm leading-relaxed whitespace-pre-wrap" dir="auto">
                            {#each wordDiff(block.originalContent || '', block.content || '') as seg}
                              {#if seg.type === 'equal'}<span>{seg.text}</span>
                              {:else if seg.type === 'insert'}<span class="bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300 rounded px-0.5" title="اضافه شده">{seg.text}</span>
                              {:else}<span class="bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 line-through rounded px-0.5" title="حذف شده">{seg.text}</span>
                              {/if}
                            {/each}
                          </p>
                        {:else}
                          <!-- Sentence-wrapped view for hover sync -->
                          <p class="text-sm leading-relaxed" dir="auto">
                            {#each srcSents as sent, sIdx}
                              <!-- svelte-ignore a11y_no_static_element_interactions -->
                              <span
                                class="inline rounded px-0.5 transition-colors cursor-default {hoveredSentenceIndex === sIdx && hoveredBlockId === block.id ? 'bg-yellow-200 dark:bg-yellow-800/60' : ''}"
                                onmouseenter={() => { hoveredBlockId = block.id; hoveredSentenceIndex = sIdx; }}
                                onmouseleave={() => { hoveredSentenceIndex = -1; }}
                              >{sent}</span>{' '}
                            {/each}
                          </p>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {:else}
                  <BlockEditor
                    bind:blocks
                    readonly={translating}
                    onChange={onBlocksChange}
                    hoveredBlockId={hoveredBlockId}
                    onHover={(id) => { hoveredBlockId = id; if (!id) hoveredSentenceIndex = -1; }}
                    sentenceHighlight={{}}
                    onSentenceHover={undefined}
                  />
                {/if}
              </div>
            </div>

            <!-- Translation column (left) -->
            <div class="flex flex-col overflow-hidden">
              <div class="px-3 py-1.5 border-b bg-muted/30 sticky top-0 z-10 shrink-0">
                <span class="text-xs font-medium text-muted-foreground">ترجمه ({project?.targetLanguage || '...'})</span>
              </div>
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                bind:this={translationScrollEl}
                onscroll={onTranslationScroll}
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
                {#each blocks as block (block.id)}
                  {@const hasSentences = block.sentences && block.sentences.length > 0}
                  {@const errorCount = blockErrorCount(block)}
                  {@const isTranslatingBlock = translating && block.sentences?.some(s => s.status === 'translating')}
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div
                    class="group/out relative rounded-lg px-2 py-1.5 transition-colors min-h-[1.5rem]
                      {hoveredBlockId === block.id ? 'bg-muted/40 ring-1 ring-primary/15' : 'hover:bg-muted/20'}"
                    onmouseenter={() => hoveredBlockId = block.id}
                    onmouseleave={() => { hoveredBlockId = ''; hoveredSentenceIndex = -1; }}
                  >
                    <!-- Error badge -->
                    {#if errorCount > 0 && !translating}
                      <div class="flex items-center justify-between mb-1.5 px-1 py-0.5 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                        <span class="text-[10px] text-red-700 dark:text-red-300">{errorCount} جمله خطا</span>
                        <button onclick={() => retryBlockErrors(block)}
                          class="text-[10px] px-2 py-0.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors shrink-0">تلاش مجدد</button>
                      </div>
                    {/if}

                    <!-- Modification indicator (shows if content or translation changed since last snapshot) -->
                    {#if !translating}
                      {@const mods = checkModifications(block)}
                      {#if mods.hasChanges || block.outOfSync}
                      <div class="flex items-center gap-2 mb-1.5 px-1 py-0.5 rounded {block.outOfSync ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800' : 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'}">
                        {#if mods.contentChanged || block.outOfSync}
                          <span class="text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-1" title="متن اصلی نسبت به آخرین ترجمه تغییر کرده">
                            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            اصل تغییر کرد
                          </span>
                        {/if}
                        {#if mods.translationChanged}
                          <span class="text-[10px] text-purple-700 dark:text-purple-300 flex items-center gap-1" title="ترجمه دستی ویرایش شده">
                            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            ترجمه ویرایش شد
                          </span>
                        {/if}
                        <div class="flex items-center gap-1 mr-auto">
                          {#if block.outOfSync}
                            <button onclick={() => retranslateSingleBlock(block)}
                              class="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors" title="ترجمه مجدد با توجه به تغییرات">
                              ترجمه مجدد
                            </button>
                          {/if}
                          <button onclick={() => { blocks = blocks.map(b => b.id === block.id ? { ...saveSnapshot(b), outOfSync: false } : b); saveBlocks(); }}
                            class="text-[10px] px-2 py-0.5 rounded bg-green-600 text-white hover:bg-green-700 transition-colors" title="تایید دستی: این نسخه را به عنوان باقی و منبع نهایی ثبت کن">
                            تایید دستی
                          </button>
                        </div>
                      </div>
                      {/if}
                    {/if}

                    <!-- Edited mode -->
                    {#if block.status === 'edited' && !showDiff}
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <div ondblclick={() => {
                          if (translating || showDiff) return;
                          const i = blocks.findIndex(b => b.id === block.id);
                          blocks[i] = { ...blocks[i], _editing: true, _editVal: block.editedTranslation || blockTranslationText(block) };
                          blocks = [...blocks];
                        }}>

                        {#if block._editing}
                          <div class="flex items-center gap-1.5 mb-1">
                            <button onclick={async () => {
                                const i = blocks.findIndex(b => b.id === block.id);
                                blocks[i] = { ...blocks[i], status: 'edited', editedTranslation: block._editVal || '', _editing: false, _editVal: undefined };
                                blocks = [...blocks]; await saveBlocks();
                              }} class="h-6 px-2.5 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors">ذخیره</button>
                            <button onclick={() => {
                                const i = blocks.findIndex(b => b.id === block.id);
                                blocks[i] = { ...blocks[i], _editing: false, _editVal: undefined }; blocks = [...blocks];
                              }} class="h-6 px-2.5 rounded border border-input bg-background text-xs hover:bg-muted transition-colors">لغو</button>
                          </div>
                          <!-- svelte-ignore a11y_no_static_element_interactions -->
                          <div contenteditable="true" dir="auto"
                            class="text-sm leading-relaxed whitespace-pre-wrap outline-none min-h-[2rem] caret-primary"
                            oninput={(e) => { const i = blocks.findIndex(b => b.id === block.id); blocks[i] = { ...blocks[i], _editVal: /** @type {any} */(e.target)?.textContent ?? '' }; }}
                          >{block.editedTranslation || blockTranslationText(block)}</div>
                        {:else}
                          {#if !translating && !showDiff}
                            <button onclick={() => { const i = blocks.findIndex(b => b.id === block.id); blocks[i] = { ...blocks[i], _editing: true, _editVal: block.editedTranslation || blockTranslationText(block) }; blocks = [...blocks]; }}
                              class="absolute top-1 left-1 p-1 rounded opacity-0 group-hover/out:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-muted"
                              title="ویرایش" aria-label="ویرایش">
                              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                            </button>
                          {/if}
                          {#if showDiff}
                            <div class="text-xs text-muted-foreground mb-1 px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">ویرایش دستی</div>
                          {/if}
                          {#if showDiff && block.originalTranslation !== undefined && block.originalTranslation !== (block.editedTranslation || '')}
                            <!-- Word-level diff view -->
                            <p class="text-sm leading-relaxed whitespace-pre-wrap" dir="auto">
                              {#each wordDiff(block.originalTranslation, block.editedTranslation || '') as seg}
                                {#if seg.type === 'equal'}<span>{seg.text}</span>
                                {:else if seg.type === 'insert'}<span class="bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300 rounded px-0.5" title="اضافه شده">{seg.text}</span>
                                {:else}<span class="bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 line-through rounded px-0.5" title="حذف شده">{seg.text}</span>
                                {/if}
                              {/each}
                            </p>
                          {:else}
                            <p class="text-sm leading-relaxed whitespace-pre-wrap" dir="auto">{block.editedTranslation}</p>
                          {/if}
                        {/if}
                      </div>

                    <!-- Sentence-by-sentence view -->
                    {:else if hasSentences}
                      <!-- Hover buttons (hidden in diff mode) -->
                      {#if !translating && !block.outOfSync && !showDiff}
                        <button onclick={() => { const i = blocks.findIndex(b => b.id === block.id); blocks[i] = { ...blocks[i], _editing: true, _editVal: blockTranslationText(block) }; blocks = [...blocks]; }}
                          class="absolute top-1 left-1 p-1 rounded opacity-0 group-hover/out:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="ویرایش" aria-label="ویرایش">
                          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </button>
                        <button onclick={() => retranslateSingleBlock(block)}
                          class="absolute top-1 left-7 p-1 rounded opacity-0 group-hover/out:opacity-100 transition-opacity text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title="ترجمه مجدد" aria-label="ترجمه مجدد">
                          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                        </button>
                      {/if}

                      <!-- Inline edit when dblclicked (disabled in diff mode) -->
                      {#if block._editing && !showDiff}
                        <div class="flex items-center gap-1.5 mb-1">
                          <button onclick={async () => {
                              const i = blocks.findIndex(b => b.id === block.id);
                              blocks[i] = { ...blocks[i], status: 'edited', editedTranslation: block._editVal || '', _editing: false, _editVal: undefined };
                              blocks = [...blocks]; await saveBlocks();
                            }} class="h-6 px-2.5 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors">ذخیره</button>
                          <button onclick={() => { const i = blocks.findIndex(b => b.id === block.id); blocks[i] = { ...blocks[i], _editing: false, _editVal: undefined }; blocks = [...blocks]; }}
                            class="h-6 px-2.5 rounded border border-input bg-background text-xs hover:bg-muted transition-colors">لغو</button>
                        </div>
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div contenteditable="true" dir="auto"
                          class="text-sm leading-relaxed whitespace-pre-wrap outline-none min-h-[2rem] caret-primary"
                          oninput={(e) => { const i = blocks.findIndex(b => b.id === block.id); blocks[i] = { ...blocks[i], _editVal: /** @type {any} */(e.target)?.textContent ?? '' }; }}
                        >{blockTranslationText(block)}</div>
                      {:else}
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <p class="text-sm leading-relaxed" dir="auto"
                          ondblclick={() => { if (translating || showDiff) return; const i = blocks.findIndex(b => b.id === block.id); blocks[i] = { ...blocks[i], _editing: true, _editVal: blockTranslationText(block) }; blocks = [...blocks]; }}>
                          {#each block.sentences as sent, sIdx (sent.id)}
                            {#if sent.status === 'translating'}
                              <span class="inline-block animate-pulse bg-muted rounded px-1 text-transparent text-xs select-none">░░░░░░░░░░░░</span>{' '}
                            {:else if sent.status === 'error'}
                              <button
                                class="inline rounded px-0.5 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-b border-red-400 cursor-pointer text-sm leading-relaxed"
                                title="خطا در ترجمه این جمله — کلیک برای تلاش مجدد"
                                onclick={() => retryBlockErrors(block)}
                                onmouseenter={() => hoveredSentenceIndex = sIdx}
                                onmouseleave={() => hoveredSentenceIndex = -1}
                              >⚠ {sent.source}</button>{' '}
                            {:else if sent.status === 'done'}
                              {#if showDiff && !block.outOfSync}
                                {@const srcSent = splitSentences(block.content)[sIdx]}
                                {#if !srcSent}
                                  <!-- Extra sentence in translation (no source pair) -->
                                  <span class="inline rounded px-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500"
                                    title="جمله اضافی در ترجمه (در متن اصلی وجود ندارد)"
                                    onmouseenter={() => { hoveredSentenceIndex = sIdx; hoveredBlockId = block.id; }}
                                    onmouseleave={() => { hoveredSentenceIndex = -1; }}
                                  >{sent.translation}</span>{' '}
                                {:else}
                                  <!-- Normal sentence - highlight on hover in diff mode -->
                                  <span
                                    class="inline rounded px-0.5 transition-colors cursor-default
                                      {hoveredSentenceIndex === sIdx && hoveredBlockId === block.id ? 'bg-yellow-200 dark:bg-yellow-800/60' : ''}"
                                    onmouseenter={() => { hoveredSentenceIndex = sIdx; hoveredBlockId = block.id; }}
                                    onmouseleave={() => { hoveredSentenceIndex = -1; }}
                                  >{sent.translation}</span>{' '}
                                {/if}
                              {:else}
                                <!-- Normal view - subtle hover only -->
                                <span
                                  class="inline rounded px-0.5 transition-colors cursor-default hover:bg-muted/60"
                                >{sent.translation}</span>{' '}
                              {/if}
                            {:else}
                              <!-- pending - show nothing yet -->
                            {/if}
                          {/each}
                          <!-- Diff: source sentences with no translation pair -->
                          {#if showDiff && !block.outOfSync && !isTranslatingBlock}
                            {@const srcSents = splitSentences(block.content)}
                            {#each srcSents as srcS, sIdx}
                              {#if !(block.sentences ?? [])[sIdx] || (block.sentences ?? [])[sIdx].status !== 'done'}
                                <!-- Missing translation - show source text highlighted -->
                                <span class="inline rounded px-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-b-2 border-amber-500 line-through opacity-80"
                                  title="این جمله در متن اصلی هست ولی ترجمه ندارد"
                                  onmouseenter={() => { hoveredSentenceIndex = sIdx; hoveredBlockId = block.id; }}
                                  onmouseleave={() => { hoveredSentenceIndex = -1; }}
                                >{srcS}</span>{' '}
                              {/if}
                            {/each}
                          {/if}
                        </p>
                      {/if}
                    {:else if !translating}
                      <!-- Empty translation block indicator in diff mode -->
                      {#if showDiff && block.content?.trim()}
                        <div class="flex items-center gap-2 px-1 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                          <span class="text-[10px] text-amber-700 dark:text-amber-300">این بند ترجمه ندارد</span>
                          {#if !translating}
                            <button onclick={() => retranslateSingleBlock(block)}
                              class="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors">
                              ترجمه کن
                            </button>
                          {/if}
                        </div>
                      {:else}
                        <p class="text-xs text-muted-foreground italic">—</p>
                      {/if}
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
            operationType="translation"
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
      <p class="text-sm text-muted-foreground mb-5" dir="rtl">همه ترجمه‌های AI پاک می‌شوند. متن اصلی بندها حفظ می‌شود.</p>
      <div class="flex gap-2 justify-end" dir="rtl">
        <button onclick={() => showResetConfirm = false} class="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors">انصراف</button>
        <button onclick={doReset} class="h-9 px-4 rounded-md bg-destructive text-destructive-foreground text-sm hover:bg-destructive/90 transition-colors">بله، از اول</button>
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
        <div class="flex justify-between"><span class="text-muted-foreground">تعداد بندها</span><span class="font-medium">{stats.total}</span></div>
        <div class="flex justify-between"><span class="text-muted-foreground">ترجمه‌شده</span><span class="font-medium text-green-600 dark:text-green-400">{stats.done}</span></div>
        <div class="flex justify-between"><span class="text-muted-foreground">ویرایش دستی</span><span class="font-medium text-blue-600 dark:text-blue-400">{stats.edited}</span></div>
        <div class="flex justify-between"><span class="text-muted-foreground">خارج از سینک</span><span class="font-medium {stats.outOfSync > 0 ? 'text-amber-600 dark:text-amber-400' : ''}">{stats.outOfSync}</span></div>

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
            <p class="text-xs text-muted-foreground mt-1">داده دقیق پس از اولین ترجمه ثبت می‌شود.</p>
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
