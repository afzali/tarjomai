<script>
  import { page } from '$app/stores';
  import { onMount, onDestroy, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentProjectStore } from '$lib/stores/currentProject.store.js';
  import projectsService from '$lib/services/projects.service.js';
  import { settingsStore } from '$lib/stores/settings.store.js';
  import { openrouterService, MAX_OUTPUT_TOKENS } from '$lib/services/openrouter.service.js';
  import { exportUtils } from '$lib/utils/export.utils.js';
  import { fetchModels } from '$lib/stores/models.store.js';
  import { allModels, resolveDefaultModel, DEFAULT_MODELS } from '$lib/models.js';
  import BlockEditor from '$lib/components/tarjomai/block-editor.svelte';
  import DiffView from '$lib/components/tarjomai/diff-view.svelte';
  import FileTypeIcon from '$lib/components/tarjomai/file-type-icon.svelte';
  import ReviewPanel from '$lib/components/tarjomai/review-panel.svelte';
  import { usageService } from '$lib/services/usage.service.js';
  import { buildGlossaryPromptSection, filterGlossaryForText } from '$lib/utils/glossary.utils.js';

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
   * @typedef {{ id: string, type: string, content: string, sentences?: SentenceItem[], translation?: string, editedTranslation?: string|null, paragraphTranslation?: string|null, status?: string, outOfSync?: boolean, _editing?: boolean, _editVal?: string, originalContent?: string, originalTranslation?: string }} Block
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
  let reviewModel = $state(DEFAULT_MODELS.review);
  let availableModels = $state(allModels);
  let modelSearch = $state('');
  let showModelDropdown = $state(false);

  // Temperature (creativity) for comparative translation — 0 = most faithful/deterministic
  let translationTemperature = $state(0.4);
  let showTempPopup = $state(false);

  // Show/hide diff highlights
  let showDiff = $state(true);

  // Translation mode: 'sentence' (layer 1) or 'paragraph' (layer 2)
  /** @type {'sentence' | 'paragraph'} */
  let translationMode = $state('sentence');
  // Which layer is currently displayed
  /** @type {1 | 2} */
  let viewLayer = $state(1);

  // Paragraph translation config
  let showParagraphSetup = $state(false);
  const defaultParagraphSystemPrompt = `شما یک ویراستار و مترجم حرفه‌ای هستید.

وظیفه شما:
- اگر «ترجمه فعلی» ارائه شده: آن را اصل قرار بده و بهبود بده. از صفر ترجمه نکن.
- اگر ترجمه‌ای نبود: متن اصلی را ترجمه کن.

قوانین مطلق:
- فقط متن نهایی را خروجی بده. هیچ توضیح، یادداشت، پیشوند یا پسوند اضافه نکن.
- هیچ معنا یا محتوایی از متن اصلی حذف نشود.`;
  const defaultParagraphBaseRules = `━━━━━━━━━━━━━━
قوانین مطلق (تغییرناپذیر)
━━━━━━━━━━━━━━
- اگر «ترجمه فعلی» ارائه شده: آن را اصل قرار بده. از صفر ترجمه نکن.
- اگر ترجمه‌ای نبود: متن اصلی را ترجمه کن.
- فقط متن نهایی را خروجی بده. هیچ توضیح، یادداشت، پیشوند یا پسوند اضافه نکن.
- هیچ معنا یا محتوایی از متن اصلی حذف نشود.`;
  const defaultParagraphUserTemplate = `{{#if translation}}متن اصلی:
{{original}}

ترجمه فعلی (تطبیقی):
{{translation}}{{else}}متن اصلی:
{{original}}{{/if}}`;
  let paragraphSystemPrompt = $state('');
  let paragraphBaseRules = $state('');
  let paragraphUserTemplate = $state('');
  let paragraphModel = $state('');
  let paragraphModelSearch = $state('');
  let showParagraphModelDropdown = $state(false);
  // Temperature (creativity) for fluent translation — usually a bit higher for natural phrasing
  let paragraphTemperature = $state(0.4);
  // Persisted paragraph config per project
  let paragraphConfigSaved = $state(false);

  /** Build the user message from template + block data */
  function buildParagraphUserMessage(/** @type {string} */ original, /** @type {string} */ translation) {
    const tmpl = paragraphUserTemplate || defaultParagraphUserTemplate;
    const hasTranslation = translation.trim().length > 0;
    // Process {{#if translation}}...{{else}}...{{/if}} conditionals
    const processed = tmpl.replace(/\{\{#if\s+translation\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_, ifBlock, elseBlock) => hasTranslation ? ifBlock : elseBlock
    );
    return processed
      .replace(/\{\{original\}\}/g, original)
      .replace(/\{\{translation\}\}/g, translation);
  }
  let showTranslateMenu = $state(false);

  // Stats popup
  let showStats = $state(false);
  /** @type {{ totalCost: number, totalTokens: number, requests: number } | null} */
  let chapterCostStats = $state(null);

  // Progress
  const translationProgressPercent = $derived(
    totalSentences > 0 ? Math.round((doneSentences / totalSentences) * 100) : 0
  );

  const outOfSyncBlocks = $derived(blocks.filter(b => b.outOfSync));

  // Glossary helper: only the entries relevant to a given text are sent (not the
  // whole glossary), to keep each request small. Falls back to empty when none.
  function glossaryFor(/** @type {string} */ text) {
    const all = config?.glossary || [];
    if (!all.length) return '';
    const relevant = filterGlossaryForText(all, text);
    return buildGlossaryPromptSection(relevant);
  }

  /**
   * The user's translation rules to inject into every prompt. Combines the
   * "system prompt" field with the "custom rules" list (each line a rule).
   * Previously customRules was saved but never sent — this fixes that.
   */
  const customRulesText = $derived.by(() => {
    const cr = config?.customRules;
    const list = Array.isArray(cr) ? cr : (typeof cr === 'string' && cr ? [cr] : []);
    return list.map((/** @type {string} */ r) => String(r).trim()).filter(Boolean).join('\n');
  });

  const rulesSection = $derived.by(() => {
    const parts = [];
    if (config?.systemPrompt && config.systemPrompt.trim()) parts.push(config.systemPrompt.trim());
    if (customRulesText) parts.push(customRulesText);
    return parts.join('\n\n');
  });

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
      reviewModel = project.chatModel || resolveDefaultModel(settings, 'review');
    } else {
      translationModel = resolveDefaultModel(settings, 'translation');
      reviewModel = resolveDefaultModel(settings, 'review');
    }

    // Load paragraph translation config
    if (project.paragraphSystemPrompt) {
      paragraphSystemPrompt = project.paragraphSystemPrompt;
      paragraphConfigSaved = true;
    }
    if (project.paragraphBaseRules) {
      paragraphBaseRules = project.paragraphBaseRules;
    }
    if (project.paragraphUserTemplate) {
      paragraphUserTemplate = project.paragraphUserTemplate;
      paragraphConfigSaved = true;
    }
    if (project.paragraphModel) {
      paragraphModel = project.paragraphModel;
    }
    if (typeof project.translationTemperature === 'number') {
      translationTemperature = project.translationTemperature;
    }
    if (typeof project.paragraphTemperature === 'number') {
      paragraphTemperature = project.paragraphTemperature;
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
   * Begin inline editing of a block's translation. Editing isn't possible while
   * the diff view is on (it would clash with the highlight markup), so we turn
   * diff off automatically — this makes "edit" always work no matter the mode.
   * @param {Block} block
   */
  function startEdit(block) {
    if (translating) return;
    if (showDiff) showDiff = false;
    const i = blocks.findIndex(b => b.id === block.id);
    if (i === -1) return;
    blocks[i] = { ...blocks[i], _editing: true, _editVal: block.editedTranslation || blockTranslationText(block) };
    blocks = [...blocks];
  }

  /** Save the current inline edit for a block. @param {Block} block */
  async function saveEdit(block) {
    const i = blocks.findIndex(b => b.id === block.id);
    if (i === -1) return;
    blocks[i] = { ...blocks[i], status: 'edited', editedTranslation: block._editVal || '', _editing: false, _editVal: undefined };
    blocks = [...blocks];
    await saveBlocks();
  }

  /** Cancel the current inline edit for a block. @param {Block} block */
  function cancelEdit(block) {
    const i = blocks.findIndex(b => b.id === block.id);
    if (i === -1) return;
    blocks[i] = { ...blocks[i], _editing: false, _editVal: undefined };
    blocks = [...blocks];
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
   * Because BlockEditor uses bind:blocks, `blocks` is already synced with newBlocks.
   * We (a) apply any metadata changes (outOfSync, sentences init), and
   * (b) ALWAYS persist — even a pure content edit with no metadata change must be
   * saved, otherwise switching chapters discards it.
   */
  async function onBlocksChange(/** @type {Block[]} */ newBlocks) {
    let metaChanged = false;
    const updated = newBlocks.map((nb) => {
      const hadTranslation = (nb.sentences?.some(s => s.status === 'done')) || !!nb.editedTranslation;
      const contentDrifted = nb.originalContent !== undefined && nb.content !== nb.originalContent;

      // Mark outOfSync when source drifts from snapshot
      if (hadTranslation && contentDrifted && !nb.outOfSync) {
        metaChanged = true;
        return { ...nb, outOfSync: true };
      }
      // Clear outOfSync if content matches snapshot again
      if (hadTranslation && !contentDrifted && nb.outOfSync) {
        metaChanged = true;
        return { ...nb, outOfSync: false };
      }
      // New block has no sentences array - initialize it
      if (!nb.sentences) {
        metaChanged = true;
        return { ...nb, sentences: makeSentences(nb.content, '') };
      }
      return nb;
    });
    // Reassign only when metadata actually changed (avoids spurious re-renders),
    // but persist on every edit so content changes are never lost on chapter switch.
    if (metaChanged) {
      blocks = updated;
    }
    await saveBlocks();
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
    // Reset block: clear any manual edit + sentences, back to pending
    const idx = blocks.findIndex(b => b.id === block.id);
    if (idx !== -1) {
      blocks[idx] = { ...blocks[idx], status: 'pending', editedTranslation: null, outOfSync: false, sentences: makeSentences(block.content, '') };
      blocks = [...blocks];
    }
    await runTranslation([blocks[idx] ?? block]);
  }

  // Confirm dialog before re-translating a block the user has hand-edited
  /** @type {Block | null} */
  let retranslateConfirmBlock = $state(null);

  /** @param {Block} block */
  function requestRetranslate(block) {
    // If the block was hand-edited, confirm before discarding the edit
    if (block.status === 'edited') {
      retranslateConfirmBlock = block;
    } else {
      retranslateSingleBlock(block);
    }
  }

  async function confirmRetranslate() {
    const block = retranslateConfirmBlock;
    retranslateConfirmBlock = null;
    if (block) await retranslateSingleBlock(block);
  }

  /**
   * Comparative (aligned) translation.
   * For each block we send the WHOLE paragraph as context plus a numbered list of
   * its sentences, and ask the model to return a JSON object keyed by sentence
   * number. This keeps the 1:1 source↔target alignment (so sentences can be
   * compared side by side) while giving the model full paragraph context — which
   * dramatically improves quality and lowers cost vs. one request per sentence.
   *
   * Any sentence the model fails to return is retried individually so that no
   * sentence is ever left untranslated.
   * @param {Block[]} targetBlocks
   */
  async function runTranslation(targetBlocks) {
    translating = true;
    abortController = new AbortController();
    const signal = abortController.signal;

    // Count total sentences (pending only)
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

        // Local indices of sentences that still need a translation
        /** @type {number[]} */
        const pendingIdx = [];
        for (let si = 0; si < sentences.length; si++) {
          if (sentences[si].source.trim() && sentences[si].status !== 'done') pendingIdx.push(si);
        }
        if (pendingIdx.length === 0) continue;

        // Mark all pending sentences in this block as translating
        for (const si of pendingIdx) sentences[si] = { ...sentences[si], status: 'translating' };
        blocks[blockIdx] = { ...blocks[blockIdx], sentences: [...sentences] };
        blocks = [...blocks];
        currentSentenceText = block.content.slice(0, 60);
        await tick();

        // --- One batched request for the whole paragraph ---
        /** @type {Record<number, string> | null} */
        let parsed = null;
        const sources = pendingIdx.map(si => sentences[si].source);
        const prompt = buildBlockTranslationPrompt(block.content, sources);
        const result = await openrouterService.sendMessage(
          settings.openRouterApiKey,
          translationModel,
          [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }],
          { signal, projectId, chapterId: selectedChapter?.id, temperature: translationTemperature, max_tokens: estimateMaxTokens(sources) }
        );
        if (signal.aborted) break;
        if (result.success !== false) {
          parsed = parseSentenceTranslations(result.content || '', pendingIdx.length);
        }

        // Apply batch results; collect sentences still missing for individual retry
        /** @type {number[]} */
        const missing = [];
        pendingIdx.forEach((si, local) => {
          const t = parsed?.[local];
          if (t && t.trim()) {
            sentences[si] = { ...sentences[si], translation: t.trim(), status: 'done' };
            doneSentences += 1;
          } else {
            missing.push(si);
          }
        });
        blocks[blockIdx] = { ...blocks[blockIdx], sentences: [...sentences] };
        blocks = [...blocks];
        await tick();

        // --- Fallback: translate any missing sentence individually (guarantees no sentence is dropped) ---
        for (const si of missing) {
          if (signal.aborted) break;
          currentSentenceText = sentences[si].source;
          await tick();
          const fb = buildTranslationPrompt(sentences[si].source);
          const r = await openrouterService.sendMessage(
            settings.openRouterApiKey,
            translationModel,
            [{ role: 'system', content: fb.system }, { role: 'user', content: fb.user }],
            { signal, projectId, chapterId: selectedChapter?.id, temperature: translationTemperature, max_tokens: estimateMaxTokens(sentences[si].source) }
          );
          if (signal.aborted) break;
          const t = r.success !== false ? (r.content || '').trim() : '';
          sentences[si] = t
            ? { ...sentences[si], translation: t, status: 'done' }
            : { ...sentences[si], status: 'error' };
          if (t) doneSentences += 1;
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

  /**
   * Estimate a sensible max_tokens for translating the given source text(s),
   * instead of always reserving a big fixed number. OpenRouter pre-reserves
   * credit based on max_tokens, so an oversized value causes 402 errors and
   * blocks low-balance keys. Persian/Arabic output is token-heavy (~1 token per
   * char), so we budget ~3× the source character count plus JSON overhead,
   * clamped to a safe range.
   * @param {string|string[]} src
   * @returns {number}
   */
  function estimateMaxTokens(src) {
    const text = Array.isArray(src) ? src.join(' ') : (src || '');
    const chars = text.length;
    const est = Math.ceil(chars * 3) + 256; // 3x for output + JSON keys/quotes
    return Math.min(MAX_OUTPUT_TOKENS, Math.max(512, est));
  }

  /**
   * Build a batched prompt: full paragraph for context + numbered sentences,
   * asking for a JSON object mapping each sentence number to its translation.
   * @param {string} paragraph
   * @param {string[]} sources
   */
  function buildBlockTranslationPrompt(paragraph, sources) {
    const srcLang = project?.sourceLanguage || 'English';
    const tgtLang = project?.targetLanguage || 'Persian';
    const rules = rulesSection;
    const glossarySection = glossaryFor(paragraph + ' ' + sources.join(' '));
    const system = `You are a professional translator. Translate from ${srcLang} to ${tgtLang}.
You receive the full paragraph for CONTEXT, then a numbered list of sentences taken from that paragraph.
Translate EACH numbered sentence into ${tgtLang}, using the whole paragraph for context (pronouns, terminology, flow).

Strict rules:
- Translate every numbered sentence. Never skip, merge, split, or reorder sentences.
- Return EXACTLY one translation per input number.
- Keep terminology and tone consistent across the whole paragraph.
- Output ONLY a valid JSON object mapping each sentence number (as a string) to its translation.
- No explanations, no notes, no markdown, no code fences.
- Example: {"1": "ترجمه جمله اول", "2": "ترجمه جمله دوم"}${rules ? `\n${rules}` : ''}${glossarySection ? `\n\n${glossarySection}` : ''}`;

    const numbered = sources.map((s, i) => `[${i + 1}] ${s}`).join('\n');
    const user = `Full paragraph (context only — do NOT translate as a whole):
"""
${paragraph}
"""

Sentences to translate (return JSON keyed by these numbers):
${numbered}`;
    return { system, user };
  }

  /**
   * Parse a model response into a map of local sentence index (0-based) → translation.
   * Accepts a JSON object keyed by 1-based numbers (e.g. {"1": "..."}) or a JSON array.
   * Tolerates surrounding text / markdown code fences. Returns null if nothing usable.
   * @param {string} content
   * @param {number} count
   * @returns {Record<number, string> | null}
   */
  function parseSentenceTranslations(content, count) {
    if (!content) return null;
    let text = content.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    // Grab the first {...} or [...] block if there is extra prose around it
    const match = text.match(/[\[{][\s\S]*[\]}]/);
    if (match) text = match[0];

    /** @type {any} */
    let data;
    try { data = JSON.parse(text); } catch { return null; }

    /** @type {Record<number, string>} */
    const out = {};
    if (Array.isArray(data)) {
      data.forEach((v, i) => { if (i < count && v != null) out[i] = String(v); });
    } else if (data && typeof data === 'object') {
      for (const [k, v] of Object.entries(data)) {
        const n = parseInt(k, 10);
        if (Number.isNaN(n) || v == null) continue;
        const local = n - 1; // keys are 1-based
        if (local >= 0 && local < count) out[local] = String(v);
      }
    } else {
      return null;
    }
    return Object.keys(out).length > 0 ? out : null;
  }

  function buildTranslationPrompt(/** @type {string} */ sourceText) {
    const srcLang = project?.sourceLanguage || 'English';
    const tgtLang = project?.targetLanguage || 'Persian';
    const rules = rulesSection;
    const glossarySection = glossaryFor(sourceText);
    const system = `You are a professional translator. Translate from ${srcLang} to ${tgtLang}.
Rules:
- Output ONLY the translated text. No explanations, no notes, no prefixes.
- Preserve the sentence structure and meaning.
- Do not add any extra sentences or commentary.${rules ? `\n${rules}` : ''}${glossarySection ? `\n\n${glossarySection}` : ''}`;
    return {
      system,
      user: sourceText
    };
  }

  /** Get the text to display for a block based on current viewLayer */
  function blockDisplayText(/** @type {Block} */ b) {
    if (viewLayer === 2 && b.paragraphTranslation) return b.paragraphTranslation;
    return blockTranslationText(b);
  }

  /** Paragraph-mode translation: sends source + layer1 translation to the selected LLM with custom prompt */
  async function translateAllParagraphs() {
    if (!selectedChapter || !settings?.openRouterApiKey || !paragraphModel) {
      showParagraphSetup = true;
      return;
    }
    translating = true;
    abortController = new AbortController();
    const signal = abortController.signal;

    const targetBlocks = blocks.filter(b => b.content.trim());
    totalSentences = targetBlocks.length;
    doneSentences = 0;

    try {
      for (const block of targetBlocks) {
        if (signal.aborted) break;
        const blockIdx = blocks.findIndex(b => b.id === block.id);
        if (blockIdx === -1) continue;

        currentSentenceText = block.content.slice(0, 50);

        const layer1 = blockTranslationText(block);
        const baseRules = paragraphBaseRules || defaultParagraphBaseRules;
        const mainPrompt = paragraphSystemPrompt || defaultParagraphSystemPrompt;
        const srcLang = project?.sourceLanguage || 'English';
        const tgtLang = project?.targetLanguage || 'Persian';
        const langLine = `زبان مبدأ: ${srcLang} | زبان مقصد (خروجی): ${tgtLang}`;
        const projectRules = customRulesText ? `\n\nقوانین پروژه:\n${customRulesText}` : '';
        const glossarySection = glossaryFor(block.content + ' ' + layer1);
        const systemMsg = `${langLine}\n\n${mainPrompt}\n\n${baseRules}${projectRules}${glossarySection ? `\n\n${glossarySection}` : ''}`;
        const userContent = buildParagraphUserMessage(block.content, layer1);

        try {
          const result = await openrouterService.sendMessage(
            settings.openRouterApiKey,
            paragraphModel,
            [{ role: 'system', content: systemMsg }, { role: 'user', content: userContent }],
            { signal, projectId, chapterId: selectedChapter?.id, temperature: paragraphTemperature, max_tokens: estimateMaxTokens(block.content + ' ' + layer1) }
          );
          const translated = (result.content || '').trim();
          blocks[blockIdx] = { ...blocks[blockIdx], paragraphTranslation: translated };
          blocks = [...blocks];
          doneSentences += 1;
          await saveBlocks();
        } catch (/** @type {any} */ e) {
          if (e?.name === 'AbortError') break;
          // Skip errored blocks, continue
          doneSentences += 1;
        }
      }
    } finally {
      translating = false;
      currentSentenceText = '';
      abortController = null;
      viewLayer = 2;
      await saveBlocks();
    }
  }

  /** Save paragraph config to project */
  async function saveParagraphConfig() {
    if (!paragraphModel) return;
    await projectsService.updateProject(projectId, {
      paragraphSystemPrompt: paragraphSystemPrompt,
      paragraphBaseRules: paragraphBaseRules,
      paragraphUserTemplate: paragraphUserTemplate,
      paragraphModel,
      paragraphTemperature
    });
    paragraphConfigSaved = true;
    showParagraphSetup = false;
  }

  // Translation confirmation
  let showTranslateConfirm = $state(false);
  let showParagraphConfirm = $state(false);

  /** Start paragraph translation after setup */
  async function startParagraphTranslation() {
    await saveParagraphConfig();
    showParagraphConfirm = true;
  }

  async function confirmAndRunParagraphTranslation() {
    showParagraphConfirm = false;
    await translateAllParagraphs();
  }

  const filteredParagraphModels = $derived(
    paragraphModelSearch.trim()
      ? availableModels.filter(m =>
          m.name.toLowerCase().includes(paragraphModelSearch.toLowerCase()) ||
          m.id.toLowerCase().includes(paragraphModelSearch.toLowerCase()) ||
          (m.provider || '').toLowerCase().includes(paragraphModelSearch.toLowerCase())
        )
      : availableModels
  );

  const paragraphModelLabel = $derived(
    availableModels.find(m => m.id === paragraphModel)?.name || paragraphModel || 'انتخاب مدل'
  );

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

  // Export modal state
  let showExportModal = $state(false);
  /** @type {'layer1'|'layer2'|'both'} */
  let exportLayer = $state('layer1');
  let exportIncludeSource = $state(false);

  function handleExport(/** @type {string} */ format) {
    if (!project || !chapters.length) return;
    const layerLabel = exportLayer === 'layer1' ? 'ترجمه تطبیقی' : exportLayer === 'layer2' ? 'ترجمه روان' : 'هر دو';
    const opts = { outputLabel: layerLabel, includeSource: exportIncludeSource, layer: exportLayer };
    if (format === 'word') {
      exportUtils.exportToWord(project, chapters, opts);
    } else if (format === 'markdown') {
      const md = exportUtils.exportToMarkdown(project, chapters, opts);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      exportUtils.downloadFile(blob, `${project.title}.md`);
    }
    showExportModal = false;
  }

  async function changeModel(/** @type {string} */ modelId) {
    translationModel = modelId;
    reviewModel = modelId;
    showModelDropdown = false;
    await projectsService.updateProject(projectId, { defaultModel: modelId, chatModel: modelId });
    if (project) project = { ...project, defaultModel: modelId, chatModel: modelId };
  }

  /** Persist the comparative-translation temperature to the project (debounced via blur/commit). */
  async function saveTranslationTemperature() {
    await projectsService.updateProject(projectId, { translationTemperature });
    if (project) project = { ...project, translationTemperature };
  }

  /** Human-readable creativity label for a temperature value. */
  function tempLabel(/** @type {number} */ t) {
    if (t <= 0) return 'دقیق‌ترین (بدون خلاقیت)';
    if (t < 0.4) return 'کم';
    if (t < 0.8) return 'متعادل';
    if (t < 1.2) return 'خلاق';
    return 'بسیار خلاق';
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

  // --- Word import ---
  /** @type {HTMLInputElement | null} */
  let wordFileInput = $state(null);
  let importingWord = $state(false);
  let importProgress = $state(0);
  let importError = $state('');

  // Import options dialog (TOC mode + footnotes)
  let showImportChoice = $state(false);
  let importHeadingCount = $state(0);
  let importHasHeadings = $state(false);
  let importIncludeFootnotes = $state(true);
  /** @type {'headings'|'chunks'} */
  let importMode = $state('headings');
  /** @type {File | null} */
  let pendingWordFile = $state(null);

  function triggerWordImport() {
    importError = '';
    wordFileInput?.click();
  }

  async function handleWordFile(/** @type {Event} */ e) {
    const input = /** @type {HTMLInputElement} */ (e.target);
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    importingWord = true;
    importProgress = 0;
    importError = '';
    try {
      // Dynamic import keeps the heavy docx-preview lib out of the initial bundle
      const { analyzeDocx } = await import('$lib/utils/docx-chapters.js');
      const { hasHeadings, headingCount } = await analyzeDocx(file, (p) => { importProgress = p; });
      importingWord = false;

      // Always show the options dialog so the user can choose footnote handling
      // (and, when the document has an outline, how chapters are built).
      pendingWordFile = file;
      importHasHeadings = hasHeadings;
      importHeadingCount = headingCount;
      importMode = hasHeadings ? 'headings' : 'chunks';
      importIncludeFootnotes = true;
      showImportChoice = true;
    } catch (/** @type {any} */ err) {
      console.error(err);
      importError = err?.message || 'خطا در پردازش فایل Word';
      importingWord = false;
    }
  }

  async function confirmWordImport() {
    if (!pendingWordFile) return;
    const file = pendingWordFile;
    const mode = importMode;
    const includeFootnotes = importIncludeFootnotes;
    showImportChoice = false;
    importingWord = true;
    importProgress = 0;
    importError = '';
    try {
      const { extractChaptersFromDocx } = await import('$lib/utils/docx-chapters.js');
      const parsed = await extractChaptersFromDocx(file, (p) => { importProgress = p; }, { mode, includeFootnotes });
      if (!parsed.length) {
        importError = 'هیچ محتوایی در فایل پیدا نشد';
        return;
      }
      for (const ch of parsed) {
        await currentProjectStore.addChapter({ title: ch.title, sourceText: ch.sourceText });
      }
      const fresh = chapters[chapters.length - parsed.length];
      if (fresh) selectChapter(fresh);
    } catch (/** @type {any} */ err) {
      console.error(err);
      importError = err?.message || 'خطا در پردازش فایل Word';
    } finally {
      importingWord = false;
      pendingWordFile = null;
    }
  }

  /**
   * Translation status for a chapter, derived from its persisted blocks.
   * @param {any} chapter
   * @returns {'none'|'partial'|'done'}
   */
  function chapterStatus(chapter) {
    const chBlocks = chapter?.blocks;
    if (!chBlocks || chBlocks.length === 0) {
      // Fall back to legacy outputText
      return chapter?.outputText?.trim() ? 'done' : 'none';
    }
    let translatable = 0;
    let translated = 0;
    for (const b of chBlocks) {
      if (!b.content?.trim()) continue;
      translatable++;
      const hasL1 = b.sentences?.some((/** @type {any} */ s) => s.status === 'done');
      const hasEdit = !!b.editedTranslation;
      const hasL2 = !!b.paragraphTranslation;
      if (hasL1 || hasEdit || hasL2) translated++;
    }
    if (translated === 0) return 'none';
    if (translated < translatable) return 'partial';
    return 'done';
  }

  // --- Batch translation across chapters ---
  let showBatchModal = $state(false);
  let batchFrom = $state(1);
  let batchTo = $state(1);
  let batchRunning = $state(false);
  let batchCurrent = $state(0);
  let batchTotal = $state(0);
  let batchCurrentTitle = $state('');

  // Names of the from/to chapters and the count in the selected range (for the modal)
  const batchFromTitle = $derived(chapters[Math.max(1, Math.min(batchFrom, chapters.length)) - 1]?.title || '');
  const batchToTitle = $derived(chapters[Math.max(1, Math.min(batchTo, chapters.length)) - 1]?.title || '');
  const batchSelectedChapters = $derived(
    chapters.slice(
      Math.max(1, Math.min(batchFrom, batchTo)) - 1,
      Math.min(chapters.length, Math.max(batchFrom, batchTo))
    )
  );

  function openBatchModal() {
    batchFrom = 1;
    batchTo = chapters.length;
    showBatchModal = true;
  }

  function stopBatch() { abortController?.abort(); batchRunning = false; }

  async function runBatchTranslation() {
    if (!settings?.openRouterApiKey || !translationModel) { showBatchModal = false; return; }
    const from = Math.max(1, Math.min(batchFrom, chapters.length));
    const to = Math.max(from, Math.min(batchTo, chapters.length));
    const slice = chapters.slice(from - 1, to);
    showBatchModal = false;
    batchRunning = true;
    batchTotal = slice.length;
    batchCurrent = 0;

    for (const ch of slice) {
      if (!batchRunning) break;
      batchCurrent++;
      batchCurrentTitle = ch.title;
      // Switch the workspace to this chapter so its blocks render/save correctly
      selectChapter(ch);
      await tick();
      // Translate all blocks of this chapter in comparative mode
      if (blocks.length && blocks.some(b => b.content.trim())) {
        await translateAllBlocks();
      }
    }
    batchRunning = false;
    batchCurrentTitle = '';
  }

  async function deleteChapter(/** @type {any} */ _chapter) {
    if (!confirm(`حذف فصل «${_chapter.title}»؟`)) return;
    await currentProjectStore.deleteChapter(_chapter.id);
    if (selectedChapter?.id === _chapter.id) { selectedChapter = null; blocks = []; }
  }

  // --- Bulk chapter selection / deletion ---
  let selectMode = $state(false);
  /** @type {Set<number>} */
  let selectedChapterIds = $state(new Set());

  function toggleSelectMode() {
    selectMode = !selectMode;
    if (!selectMode) selectedChapterIds = new Set();
  }

  /** @param {number} id */
  function toggleChapterSelected(id) {
    const next = new Set(selectedChapterIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    selectedChapterIds = next;
  }

  function selectAllChapters() {
    if (selectedChapterIds.size === chapters.length) {
      selectedChapterIds = new Set();
    } else {
      selectedChapterIds = new Set(chapters.map(c => c.id));
    }
  }

  async function deleteSelectedChapters() {
    const ids = [...selectedChapterIds];
    if (ids.length === 0) return;
    if (!confirm(`حذف ${ids.length} فصل انتخاب‌شده؟ این عمل قابل بازگشت نیست.`)) return;
    for (const id of ids) {
      await currentProjectStore.deleteChapter(id);
      if (selectedChapter?.id === id) { selectedChapter = null; blocks = []; }
    }
    selectedChapterIds = new Set();
    selectMode = false;
  }

  function confirmReset() { showResetConfirm = true; }

  async function doReset() {
    blocks = blocks.map(b => ({ ...b, translation: '', status: 'pending', editedTranslation: null, outOfSync: false, sentences: makeSentences(b.content, '') }));
    await saveBlocks();
    showResetConfirm = false;
  }

  function computeFinalOutput() {
    return blocks.map(b => blockDisplayText(b)).join('\n\n');
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
            { signal, projectId, chapterId: selectedChapter?.id, temperature: translationTemperature, max_tokens: estimateMaxTokens(sentences[si].source) }
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

    <!-- Chapter list toolbar -->
    {#if chapters.length > 0}
      <div class="px-2 py-1.5 border-b flex items-center justify-between gap-1">
        <span class="text-[11px] text-muted-foreground">{chapters.length} فصل</span>
        {#if selectMode}
          <div class="flex items-center gap-1">
            <button onclick={selectAllChapters}
              class="text-[11px] px-1.5 py-0.5 rounded hover:bg-muted transition-colors text-muted-foreground">
              {selectedChapterIds.size === chapters.length ? 'لغو همه' : 'همه'}
            </button>
            <button onclick={deleteSelectedChapters} disabled={selectedChapterIds.size === 0}
              class="text-[11px] px-1.5 py-0.5 rounded text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40">
              حذف ({selectedChapterIds.size})
            </button>
            <button onclick={toggleSelectMode}
              class="text-[11px] px-1.5 py-0.5 rounded hover:bg-muted transition-colors">بستن</button>
          </div>
        {:else}
          <button onclick={toggleSelectMode}
            class="text-[11px] px-1.5 py-0.5 rounded hover:bg-muted transition-colors text-muted-foreground inline-flex items-center gap-1" title="انتخاب چند فصل برای حذف">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            انتخاب
          </button>
        {/if}
      </div>
    {/if}

    <div class="flex-1 overflow-y-auto p-2 space-y-0.5">
      {#each chapters as chapter, chapterIndex (chapter.id)}
        {@const st = chapterStatus(chapter)}
        {@const isSel = selectedChapterIds.has(chapter.id)}
        <div class="group flex items-center gap-1 rounded-lg {selectMode && isSel ? 'bg-primary/10 ring-1 ring-primary/30' : selectedChapter?.id === chapter.id && !selectMode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}">
          {#if selectMode}
            <button onclick={() => toggleChapterSelected(chapter.id)} class="flex-1 text-right px-3 py-2 text-sm truncate" aria-label="انتخاب فصل">
              <div class="flex items-center gap-2">
                <span class="w-4 h-4 rounded border flex items-center justify-center shrink-0 {isSel ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'}">
                  {#if isSel}<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>{/if}
                </span>
                <span class="text-[11px] tabular-nums shrink-0 text-muted-foreground">{chapterIndex + 1}.</span>
                <span class="truncate">{chapter.title}</span>
              </div>
            </button>
          {:else}
            <button onclick={() => selectChapter(chapter)} class="flex-1 text-right px-3 py-2 text-sm truncate">
              <div class="flex items-center gap-1.5">
                <!-- Translation status dot -->
                {#if st === 'done'}
                  <span class="w-2 h-2 rounded-full shrink-0 bg-green-500" title="ترجمه کامل"></span>
                {:else if st === 'partial'}
                  <span class="w-2 h-2 rounded-full shrink-0 bg-amber-500" title="ترجمه ناقص"></span>
                {:else}
                  <span class="w-2 h-2 rounded-full shrink-0 border border-muted-foreground/40 {selectedChapter?.id === chapter.id ? 'border-primary-foreground/50' : ''}" title="ترجمه‌نشده"></span>
                {/if}
                <span class="text-[11px] tabular-nums shrink-0 {selectedChapter?.id === chapter.id ? 'text-primary-foreground/60' : 'text-muted-foreground'}">{chapterIndex + 1}.</span>
                <span class="truncate">{chapter.title}</span>
              </div>
            </button>
            <button onclick={() => deleteChapter(chapter)} title="حذف فصل"
              class="p-1.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity {selectedChapter?.id === chapter.id ? 'text-primary-foreground/70 hover:text-primary-foreground' : 'text-muted-foreground hover:text-destructive'}">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          {/if}
        </div>
      {/each}
    </div>
    <div class="p-2 border-t space-y-1">
      <button onclick={() => showNewChapterModal = true}
        class="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        فصل جدید
      </button>
      <!-- Word import -->
      <input bind:this={wordFileInput} type="file" accept=".docx" class="hidden" onchange={handleWordFile} />
      <button onclick={triggerWordImport} disabled={importingWord}
        class="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs border border-input bg-background hover:bg-muted transition-colors disabled:opacity-50">
        {#if importingWord}
          <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          در حال ایمپورت {importProgress}٪
        {:else}
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
          ایمپورت از Word
        {/if}
      </button>
      {#if importError}
        <p class="text-[11px] text-destructive text-center px-1">{importError}</p>
      {/if}
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

      <!-- Batch translate -->
      {#if chapters.length > 0}
        <button onclick={openBatchModal} disabled={batchRunning || translating}
          class="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-input bg-background text-xs hover:bg-muted transition-colors disabled:opacity-50"
          title="ترجمه دسته‌ای فصل‌ها">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M14 14h7v7h-7z"/><path d="M3 14h7v7H3z"/></svg>
          ترجمه دسته‌ای
        </button>
      {/if}

      <!-- Glossary link -->
      <a href="/projects/{projectId}/glossary"
        class="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-input bg-background text-xs hover:bg-muted transition-colors {(config?.glossary?.length) ? 'text-primary border-primary/30' : 'text-muted-foreground'}"
        title="واژه‌نامه">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        واژه‌نامه{#if config?.glossary?.length} <span class="text-[10px] opacity-80">({config.glossary.length})</span>{/if}
      </a>

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
      
      <!-- Temperature (creativity) control -->
      <div class="relative">
        <button onclick={() => showTempPopup = !showTempPopup}
          class="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-input bg-background text-xs hover:bg-muted transition-colors {translationTemperature > 0 ? 'text-primary border-primary/30' : 'text-muted-foreground'}"
          title="درجه خلاقیت (Temperature)">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>
          {translationTemperature.toFixed(1)}
        </button>
        {#if showTempPopup}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="absolute left-0 top-9 z-50 w-64 rounded-xl border bg-popover shadow-lg p-3" onmouseleave={() => { showTempPopup = false; saveTranslationTemperature(); }}>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-medium">درجه خلاقیت</span>
              <span class="text-xs text-muted-foreground tabular-nums">{translationTemperature.toFixed(1)}</span>
            </div>
            <input type="range" min="0" max="2" step="0.1" bind:value={translationTemperature}
              onchange={saveTranslationTemperature}
              class="w-full accent-primary cursor-pointer"/>
            <div class="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
              <span>دقیق</span>
              <span>خلاق</span>
            </div>
            <p class="text-[10px] text-muted-foreground mt-2 leading-relaxed">
              <span class="font-medium text-foreground">{tempLabel(translationTemperature)}</span> — مقدار کمتر یعنی ترجمه وفادارتر و یکدست‌تر؛ مقدار بیشتر یعنی واژه‌گزینی آزادتر و خلاقانه‌تر. برای ترجمه تطبیقی معمولاً ۰ تا ۰٫۳ بهترین است.
            </p>
          </div>
        {/if}
      </div>

      <!-- Export -->
      <button onclick={() => showExportModal = true}
        class="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-input bg-background text-xs hover:bg-muted transition-colors" aria-label="خروجی">
        خروجی <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9 6 21 18 21 18 9"/></svg>
      </button>
      
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

            <!-- Layer toggle -->
            <div class="inline-flex items-center rounded-md border border-input bg-background overflow-hidden">
              <button onclick={() => viewLayer = 1}
                class="h-7 px-2 text-xs transition-colors {viewLayer === 1 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}">
                تطبیقی
              </button>
              <button onclick={() => viewLayer = 2}
                class="h-7 px-2 text-xs transition-colors border-r {viewLayer === 2 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}">
                روان
              </button>
            </div>

            {#if translating}
              <button onclick={stopTranslation}
                class="inline-flex items-center gap-1 h-7 px-2.5 rounded text-xs bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 transition-colors">توقف</button>
            {:else}
              <!-- Translation button with dropdown mode selector -->
              <div class="relative">
                <button onclick={() => {
                    if (translationMode === 'sentence') { showTranslateConfirm = true; }
                    else { showParagraphConfirm = true; }
                  }}
                  disabled={blocks.length === 0 || blocks.every(b => !b.content.trim()) || (translationMode === 'sentence' && !translationModel)}
                  class="inline-flex items-center gap-1.5 h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors rounded-md"
                  title={translationMode === 'sentence' ? 'ترجمه تطبیقی — جمله‌به‌جمله و قابل مقایسه با متن اصلی' : 'ترجمه روان — صیقل نهایی برای متنی یکدست و طبیعی'}>
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                  {translationMode === 'sentence' ? 'ترجمه تطبیقی' : 'ترجمه روان'}
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <svg class="w-3 h-3 opacity-60 cursor-pointer hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"
                    onclick={(e) => { e.stopPropagation(); showTranslateMenu = !showTranslateMenu; }}><path d="m6 9 6 6 6-6"/></svg>
                </button>
                {#if showTranslateMenu}
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div class="absolute left-0 top-8 z-50 w-56 rounded-xl border bg-popover shadow-lg py-1"
                    onmouseleave={() => showTranslateMenu = false}>
                    <!-- Sentence mode -->
                    <button onclick={() => { translationMode = 'sentence'; showTranslateMenu = false; }}
                      class="w-full text-right text-xs px-3 py-2 hover:bg-muted transition-colors flex items-center gap-2">
                      <svg class="w-3.5 h-3.5 shrink-0 {translationMode === 'sentence' ? 'text-primary' : 'text-transparent'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
                      <span class="flex-1">ترجمه تطبیقی</span>
                      <span class="text-[10px] text-muted-foreground">جمله‌به‌جمله</span>
                    </button>
                    <!-- Paragraph mode -->
                    <div class="flex items-center hover:bg-muted transition-colors">
                      <button onclick={() => { translationMode = 'paragraph'; showTranslateMenu = false; }}
                        class="flex-1 text-right text-xs px-3 py-2 flex items-center gap-2">
                        <svg class="w-3.5 h-3.5 shrink-0 {translationMode === 'paragraph' ? 'text-primary' : 'text-transparent'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
                        <span class="flex-1">ترجمه روان</span>
                        <span class="text-[10px] text-muted-foreground">صیقل نهایی</span>
                      </button>
                      <button onclick={() => { showParagraphSetup = true; showTranslateMenu = false; }}
                        class="p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0" title="تنظیمات پرامپت و مدل">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          </div>

          <!-- Progress bar -->
          {#if translating}
            <div class="px-4 py-2 border-b bg-muted/20 shrink-0">
              <div class="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span class="truncate max-w-xs" title={currentSentenceText}>
                  {doneSentences}/{totalSentences} {translationMode === 'paragraph' ? 'پاراگراف' : 'جمله'}                  {#if currentSentenceText} — <span class="italic opacity-70 truncate">{currentSentenceText.slice(0, 40)}{currentSentenceText.length > 40 ? '…' : ''}</span>{/if}
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
                {#if showDiff && blocks.some(b => b.content.trim())}
                  <!-- In diff mode: show read-only view with sentence-level hover sync -->
                  <!-- Spacing kept in sync with BlockEditor (py-0.5 px-1, no extra gaps) so toggling diff doesn't shift the layout -->
                  <div>
                    {#each blocks as block (block.id)}
                      {@const contentChanged = block.originalContent !== undefined && block.content !== block.originalContent}
                      {@const srcSents = splitSentences(block.content)}
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <div
                        class="rounded py-0.5 px-1 transition-colors {hoveredBlockId === block.id ? 'bg-muted/40 ring-1 ring-primary/15' : ''}"
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
                          <!-- -mx-0.5 cancels the px-0.5 on the first/last sentence span so text aligns with BlockEditor -->
                          <p class="text-sm leading-relaxed -mx-0.5" dir="auto">
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
              <div class="px-3 py-1.5 border-b bg-muted/30 sticky top-0 z-10 shrink-0 flex items-center gap-2">
                <span class="text-xs font-medium text-muted-foreground">ترجمه ({project?.targetLanguage || '...'})</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full {viewLayer === 1 ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300'}">
                  {viewLayer === 1 ? 'تطبیقی' : 'روان'}
                </span>
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
                    <!-- Layer 2: Fluent (polished) translation view -->
                    {#if viewLayer === 2}
                      {#if block.paragraphTranslation}
                        <p class="text-sm leading-relaxed whitespace-pre-wrap" dir="auto">{block.paragraphTranslation}</p>
                      {:else if block.content?.trim()}
                        <p class="text-xs text-muted-foreground italic flex items-center gap-1">
                          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                          ترجمه روان ندارد
                        </p>
                      {:else}
                        <p class="text-xs text-muted-foreground italic">—</p>
                      {/if}
                    <!-- Layer 1: Comparative (aligned) translation view -->
                    {:else}
                    <!-- Error badge -->
                    {#if errorCount > 0 && !translating}
                      <div class="flex items-center justify-between mb-1.5 px-1 py-0.5 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                        <span class="text-[10px] text-red-700 dark:text-red-300">{errorCount} جمله خطا</span>
                        <button onclick={() => retryBlockErrors(block)}
                          class="text-[10px] px-2 py-0.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors shrink-0">تلاش مجدد</button>
                      </div>
                    {/if}

                    <!-- Out-of-sync indicator: source text changed after translation -->
                    {#if !translating && block.outOfSync}
                      <div class="flex items-center gap-2 mb-1.5 px-1 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                        <span class="text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-1" title="متن اصلی نسبت به آخرین ترجمه تغییر کرده">
                          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          اصل تغییر کرد
                        </span>
                        <div class="flex items-center gap-1 mr-auto">
                          <button onclick={() => requestRetranslate(block)}
                            class="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors" title="ترجمه مجدد با توجه به تغییرات">
                            ترجمه مجدد
                          </button>
                        </div>
                      </div>
                    {/if}

                    <!-- Edited mode (always shows the edited text; editing auto-disables diff) -->
                    {#if block.status === 'edited'}
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <div ondblclick={() => startEdit(block)}>

                        {#if block._editing}
                          <div class="flex items-center gap-1.5 mb-1">
                            <button onclick={() => saveEdit(block)} class="h-6 px-2.5 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors">ذخیره</button>
                            <button onclick={() => cancelEdit(block)} class="h-6 px-2.5 rounded border border-input bg-background text-xs hover:bg-muted transition-colors">لغو</button>
                          </div>
                          <!-- svelte-ignore a11y_no_static_element_interactions -->
                          <div contenteditable="true" dir="auto"
                            class="text-sm leading-relaxed whitespace-pre-wrap outline-none min-h-[2rem] caret-primary border border-primary/30 rounded p-1.5 bg-background"
                            oninput={(e) => { const i = blocks.findIndex(b => b.id === block.id); blocks[i] = { ...blocks[i], _editVal: /** @type {any} */(e.target)?.textContent ?? '' }; }}
                          >{block.editedTranslation || blockTranslationText(block)}</div>
                        {:else}
                          {#if !translating}
                            <button onclick={() => startEdit(block)}
                              class="absolute top-1 left-1 p-1 rounded opacity-0 group-hover/out:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-muted"
                              title="ویرایش" aria-label="ویرایش">
                              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                            </button>
                            <button onclick={() => requestRetranslate(block)}
                              class="absolute top-1 left-7 p-1 rounded opacity-0 group-hover/out:opacity-100 transition-opacity text-muted-foreground hover:text-primary hover:bg-primary/10"
                              title="ترجمه مجدد این بند" aria-label="ترجمه مجدد">
                              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                            </button>
                          {/if}
                          <!-- Tag that this block was hand-edited -->
                          <div class="text-[10px] text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            ویرایش دستی
                          </div>
                          {#if showDiff && block.originalTranslation !== undefined && block.originalTranslation !== (block.editedTranslation || '')}
                            <!-- Word-level diff between the model output and your edit -->
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
                      <!-- Hover buttons -->
                      {#if !translating && !block.outOfSync && !showDiff}
                        <button onclick={() => startEdit(block)}
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

                      <!-- Inline edit when dblclicked (startEdit auto-disables diff) -->
                      {#if block._editing}
                        <div class="flex items-center gap-1.5 mb-1">
                          <button onclick={() => saveEdit(block)} class="h-6 px-2.5 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors">ذخیره</button>
                          <button onclick={() => cancelEdit(block)} class="h-6 px-2.5 rounded border border-input bg-background text-xs hover:bg-muted transition-colors">لغو</button>
                        </div>
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div contenteditable="true" dir="auto"
                          class="text-sm leading-relaxed whitespace-pre-wrap outline-none min-h-[2rem] caret-primary border border-primary/30 rounded p-1.5 bg-background"
                          oninput={(e) => { const i = blocks.findIndex(b => b.id === block.id); blocks[i] = { ...blocks[i], _editVal: /** @type {any} */(e.target)?.textContent ?? '' }; }}
                        >{blockTranslationText(block)}</div>
                      {:else}
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <p class="text-sm leading-relaxed" dir="auto"
                          ondblclick={() => startEdit(block)}>
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

<!-- Batch Translation Modal -->
{#if showBatchModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => showBatchModal = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-card border rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-lg font-semibold mb-1" dir="rtl">ترجمه دسته‌ای فصل‌ها</h3>
      <p class="text-xs text-muted-foreground mb-4" dir="rtl">
        بازه‌ی فصل‌هایی که می‌خواهی ترجمه‌ی تطبیقی روی آن‌ها اجرا شود را مشخص کن. مدل: <span class="font-medium text-foreground">{translationModelLabel}</span>
      </p>
      <div class="grid grid-cols-2 gap-3" dir="rtl">
        <div class="space-y-1">
          <label for="batch-from" class="text-xs font-medium">از فصل</label>
          <input id="batch-from" type="number" min="1" max={chapters.length} bind:value={batchFrom}
            class="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"/>
          {#if batchFromTitle}
            <p class="text-[11px] text-muted-foreground truncate" title={batchFromTitle}>{batchFromTitle}</p>
          {/if}
        </div>
        <div class="space-y-1">
          <label for="batch-to" class="text-xs font-medium">تا فصل</label>
          <input id="batch-to" type="number" min="1" max={chapters.length} bind:value={batchTo}
            class="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"/>
          {#if batchToTitle}
            <p class="text-[11px] text-muted-foreground truncate" title={batchToTitle}>{batchToTitle}</p>
          {/if}
        </div>
      </div>

      <!-- Preview of selected chapters -->
      {#if batchSelectedChapters.length > 0}
        <div class="mt-3 rounded-lg border bg-muted/30 p-2 max-h-32 overflow-y-auto" dir="rtl">
          <p class="text-[11px] text-muted-foreground mb-1">{batchSelectedChapters.length} فصل انتخاب شده:</p>
          <ol class="space-y-0.5">
            {#each batchSelectedChapters as ch}
              {@const num = chapters.indexOf(ch) + 1}
              <li class="text-xs flex items-center gap-1.5 truncate">
                <span class="tabular-nums text-muted-foreground shrink-0">{num}.</span>
                <span class="truncate">{ch.title}</span>
              </li>
            {/each}
          </ol>
        </div>
      {/if}

      <p class="text-[11px] text-muted-foreground mt-2" dir="rtl">مجموع فصل‌ها: {chapters.length}</p>
      <div class="flex gap-2 justify-end mt-4" dir="rtl">
        <button onclick={() => showBatchModal = false} class="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors">انصراف</button>
        <button onclick={runBatchTranslation} disabled={!translationModel || chapters.length === 0}
          class="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-40 transition-colors">شروع ترجمه</button>
      </div>
    </div>
  </div>
{/if}

<!-- Batch progress banner -->
{#if batchRunning}
  <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border rounded-xl shadow-xl px-4 py-3 w-80" dir="rtl">
    <div class="flex items-center justify-between mb-1.5">
      <span class="text-xs font-medium">ترجمه دسته‌ای — فصل {batchCurrent}/{batchTotal}</span>
      <button onclick={stopBatch} class="text-xs text-destructive hover:underline">توقف</button>
    </div>
    {#if batchCurrentTitle}
      <p class="text-[11px] text-muted-foreground truncate mb-1.5" title={batchCurrentTitle}>در حال ترجمه: {batchCurrentTitle}</p>
    {/if}
    <div class="h-1.5 rounded-full bg-muted overflow-hidden">
      <div class="h-full rounded-full bg-primary transition-all duration-300" style="width: {batchTotal > 0 ? Math.round((batchCurrent / batchTotal) * 100) : 0}%"></div>
    </div>
  </div>
{/if}

<!-- Word Import: options (chapter mode + footnotes) -->
{#if showImportChoice}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => { showImportChoice = false; pendingWordFile = null; }}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-card border rounded-xl p-6 w-full max-w-md mx-4 shadow-xl max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()} dir="rtl">
      <h3 class="text-lg font-semibold mb-4">تنظیمات ایمپورت از Word</h3>

      <!-- Chapter building mode -->
      {#if importHasHeadings}
        <div class="mb-4">
          <p class="text-sm font-medium mb-1">ساخت فصل‌ها</p>
          <p class="text-xs text-muted-foreground mb-2">این سند دارای فهرست/عنوان‌بندی با {importHeadingCount} عنوان است.</p>
          <div class="space-y-2">
            <button onclick={() => importMode = 'headings'}
              class="w-full text-right px-3 py-2.5 rounded-lg border text-sm transition-colors {importMode === 'headings' ? 'border-primary bg-primary/5' : 'border-input hover:bg-muted'}">
              <div class="font-medium flex items-center gap-2">
                <span class="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 {importMode === 'headings' ? 'border-primary' : 'border-muted-foreground/40'}">{#if importMode === 'headings'}<span class="w-2 h-2 rounded-full bg-primary"></span>{/if}</span>
                استفاده از فهرست خود سند
              </div>
              <div class="text-xs text-muted-foreground mt-1 pr-6">هر عنوان سند یک فصل می‌شود (پیشنهادی)</div>
            </button>
            <button onclick={() => importMode = 'chunks'}
              class="w-full text-right px-3 py-2.5 rounded-lg border text-sm transition-colors {importMode === 'chunks' ? 'border-primary bg-primary/5' : 'border-input hover:bg-muted'}">
              <div class="font-medium flex items-center gap-2">
                <span class="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 {importMode === 'chunks' ? 'border-primary' : 'border-muted-foreground/40'}">{#if importMode === 'chunks'}<span class="w-2 h-2 rounded-full bg-primary"></span>{/if}</span>
                تقسیم خودکار به بخش‌های مساوی
              </div>
              <div class="text-xs text-muted-foreground mt-1 pr-6">نادیده‌گرفتن عنوان‌ها و تقسیم متن به بخش‌های هم‌اندازه</div>
            </button>
          </div>
        </div>
      {:else}
        <p class="text-xs text-muted-foreground mb-4">این سند فهرست/عنوان‌بندی ندارد؛ متن به بخش‌های مساوی تقسیم می‌شود.</p>
      {/if}

      <!-- Footnotes toggle -->
      <div class="flex items-center justify-between py-3 border-t">
        <div class="min-w-0 pl-3">
          <p class="text-sm font-medium">پاورقی‌ها و یادداشت‌های پایانی</p>
          <p class="text-xs text-muted-foreground mt-0.5">اگر روشن باشد، متن پاورقی‌ها (footnote/endnote) هم وارد و ترجمه می‌شود</p>
        </div>
        <button onclick={() => importIncludeFootnotes = !importIncludeFootnotes}
          role="switch" aria-checked={importIncludeFootnotes} aria-label="شامل پاورقی‌ها" dir="ltr"
          class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors {importIncludeFootnotes ? 'bg-primary' : 'bg-muted-foreground/30'}">
          <span class="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform {importIncludeFootnotes ? 'translate-x-4' : 'translate-x-0.5'}"></span>
        </button>
      </div>

      <div class="flex gap-2 justify-end mt-4">
        <button onclick={() => { showImportChoice = false; pendingWordFile = null; }}
          class="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors">انصراف</button>
        <button onclick={confirmWordImport}
          class="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">شروع ایمپورت</button>
      </div>
    </div>
  </div>
{/if}

<!-- Confirm re-translate of a hand-edited block -->
{#if retranslateConfirmBlock}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => retranslateConfirmBlock = null}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-card border rounded-xl p-5 w-full max-w-sm mx-4 shadow-xl" onclick={(e) => e.stopPropagation()} dir="rtl">
      <h3 class="text-base font-semibold mb-2">ترجمه مجدد این بند؟</h3>
      <p class="text-sm text-muted-foreground mb-4">
        این بند را دستی ویرایش کرده‌اید. با ترجمه مجدد، ویرایش دستی شما حذف و متن از نو ترجمه می‌شود. مطمئن هستید؟
      </p>
      <div class="flex gap-2 justify-end">
        <button onclick={() => retranslateConfirmBlock = null} class="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors">انصراف</button>
        <button onclick={confirmRetranslate}
          class="h-9 px-4 rounded-md bg-amber-500 text-white text-sm hover:bg-amber-600 transition-colors">بله، دوباره ترجمه کن</button>
      </div>
    </div>
  </div>
{/if}

<!-- Paragraph Translation Setup Modal -->
{#if showParagraphSetup}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => showParagraphSetup = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-card border rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-lg font-semibold mb-1" dir="rtl">تنظیمات ترجمه روان</h3>
      <p class="text-xs text-muted-foreground mb-4" dir="rtl">
        هر پاراگراف همراه ترجمه تطبیقی (در صورت وجود) طبق قالب زیر به مدل ارسال می‌شود. نتیجه به‌عنوان ترجمه روان ذخیره می‌شود.
      </p>
      <div class="space-y-4" dir="rtl">
        <!-- Model selection -->
        <div class="space-y-1.5">
          <span class="text-sm font-medium block">مدل LLM</span>
          <div class="relative">
            <button onclick={() => { showParagraphModelDropdown = !showParagraphModelDropdown; paragraphModelSearch = ''; }}
              class="w-full h-9 text-sm px-3 rounded-md border border-input bg-background text-right truncate hover:bg-muted transition-colors">
              {paragraphModelLabel}
            </button>
            {#if showParagraphModelDropdown}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="absolute right-0 top-10 z-50 w-full rounded-xl border bg-popover shadow-lg" onmouseleave={() => showParagraphModelDropdown = false}>
                <div class="p-2 border-b">
                  <input type="text" bind:value={paragraphModelSearch} placeholder="جستجوی مدل..." dir="rtl"
                    class="w-full h-7 text-xs px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"/>
                </div>
                <div class="max-h-44 overflow-y-auto p-1">
                  {#each filteredParagraphModels as m (m.id)}
                    <button onclick={() => { paragraphModel = m.id; showParagraphModelDropdown = false; }}
                      class="w-full text-right text-xs px-2 py-1.5 rounded-md hover:bg-muted transition-colors flex items-center gap-2 {paragraphModel === m.id ? 'bg-primary/10 font-medium' : ''}">
                      <span class="text-muted-foreground text-[10px] shrink-0">{m.provider || ''}</span>
                      <span class="truncate flex-1">{m.name}</span>
                    </button>
                  {/each}
                  {#if filteredParagraphModels.length === 0}<p class="text-xs text-muted-foreground text-center py-3">مدلی پیدا نشد</p>{/if}
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Temperature (creativity) -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">درجه خلاقیت (Temperature)</span>
            <span class="text-xs text-muted-foreground tabular-nums">{paragraphTemperature.toFixed(1)} — {tempLabel(paragraphTemperature)}</span>
          </div>
          <input type="range" min="0" max="2" step="0.1" bind:value={paragraphTemperature}
            class="w-full accent-primary cursor-pointer"/>
          <div class="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>دقیق و وفادار</span>
            <span>آزاد و خلاق</span>
          </div>
          <p class="text-[10px] text-muted-foreground">
            مقدار بیشتر، خروجی روان‌تر و آزادتر می‌دهد. برای ترجمه روان معمولاً ۰٫۳ تا ۰٫۷ مناسب است.
          </p>
        </div>

        <!-- System prompt -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">دستورالعمل کلی (System Prompt)</span>
            <button onclick={() => { paragraphSystemPrompt = ''; }}
              class="text-[10px] text-muted-foreground hover:text-foreground transition-colors" title="بازگشت به پیش‌فرض">بازنشانی</button>
          </div>
          <textarea bind:value={paragraphSystemPrompt} rows="5" dir="rtl" placeholder={defaultParagraphSystemPrompt}
            class="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] font-mono text-xs leading-relaxed"></textarea>
          <p class="text-[10px] text-muted-foreground">
            این پرامپت به عنوان نقش سیستمی به مدل ارسال می‌شود. اگر خالی بگذارید، پیش‌فرض استفاده خواهد شد.
          </p>
        </div>

        <!-- Base rules (always appended) -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">قوانین پایه <span class="text-[10px] font-normal text-amber-600 dark:text-amber-400">(همیشه به انتهای دستورالعمل اضافه می‌شود)</span></span>
            <button onclick={() => { paragraphBaseRules = ''; }}
              class="text-[10px] text-muted-foreground hover:text-foreground transition-colors" title="بازگشت به پیش‌فرض">بازنشانی</button>
          </div>
          <textarea bind:value={paragraphBaseRules} rows="5" dir="rtl" placeholder={defaultParagraphBaseRules}
            class="w-full px-3 py-2 rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-amber-400/50 min-h-[80px] font-mono text-xs leading-relaxed"></textarea>
          <p class="text-[10px] text-muted-foreground">
            این بخش همیشه به انتهای دستورالعمل کلی اضافه می‌شود — حتی اگر دستورالعمل سفارشی گذاشته باشید. اگر خالی بگذارید، پیش‌فرض استفاده می‌شود.
          </p>
        </div>

        <!-- User message template -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">قالب متن هر پاراگراف (User Prompt)</span>
            <button onclick={() => { paragraphUserTemplate = ''; }}
              class="text-[10px] text-muted-foreground hover:text-foreground transition-colors" title="بازگشت به پیش‌فرض">بازنشانی</button>
          </div>
          <textarea bind:value={paragraphUserTemplate} rows="6" dir="rtl" placeholder={defaultParagraphUserTemplate}
            class="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px] font-mono text-xs leading-relaxed"></textarea>
          <div class="text-[10px] text-muted-foreground space-y-1">
            <p>از متغیرهای زیر در قالب استفاده کنید:</p>
            <div class="flex flex-wrap gap-x-3 gap-y-0.5">
              <span><code class="px-1 py-0.5 rounded bg-muted text-[10px]">{'{{original}}'}</code> متن اصلی پاراگراف</span>
              <span><code class="px-1 py-0.5 rounded bg-muted text-[10px]">{'{{translation}}'}</code> ترجمه تطبیقی</span>
            </div>
            <p class="mt-1">برای شرطی کردن (اگر ترجمه وجود داشت/نداشت):</p>
            <code class="block px-2 py-1 rounded bg-muted text-[10px] whitespace-pre-wrap leading-relaxed">{'{{#if translation}}...{{else}}...{{/if}}'}</code>
          </div>
        </div>
      </div>

      <div class="flex gap-2 justify-end mt-5" dir="rtl">
        <button onclick={() => showParagraphSetup = false} class="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors">انصراف</button>
        <button onclick={saveParagraphConfig} disabled={!paragraphModel}
          class="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors disabled:opacity-40"
          title="ذخیره بدون شروع ترجمه">ذخیره</button>
        <button onclick={startParagraphTranslation} disabled={!paragraphModel}
          class="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-40 transition-colors">
          شروع ترجمه روان
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Sentence Translation Confirmation -->
{#if showTranslateConfirm}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => showTranslateConfirm = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-card border rounded-xl p-5 w-full max-w-sm mx-4 shadow-xl" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-base font-semibold mb-2" dir="rtl">شروع ترجمه تطبیقی؟</h3>
      <p class="text-sm text-muted-foreground mb-4" dir="rtl">
        ترجمه تطبیقی (جمله‌به‌جمله و قابل مقایسه با متن اصلی) روی تمام بندهای این فصل اجرا خواهد شد.
      </p>
      <div class="flex gap-2 justify-end" dir="rtl">
        <button onclick={() => showTranslateConfirm = false} class="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors">انصراف</button>
        <button onclick={() => { showTranslateConfirm = false; translateAllBlocks(); }}
          class="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">
          بله، شروع کن
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Paragraph Translation Confirmation -->
{#if showParagraphConfirm}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => showParagraphConfirm = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-card border rounded-xl p-5 w-full max-w-sm mx-4 shadow-xl" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-base font-semibold mb-2" dir="rtl">شروع ترجمه روان؟</h3>
      <p class="text-sm text-muted-foreground mb-1" dir="rtl">
        ترجمه روان (صیقل نهایی برای متنی یکدست و طبیعی) روی تمام بندهای این فصل اجرا خواهد شد.
      </p>
      <p class="text-xs text-muted-foreground mb-4" dir="rtl">
        مدل: <span class="font-medium text-foreground">{paragraphModelLabel}</span>
      </p>
      <div class="flex gap-2 justify-end" dir="rtl">
        <button onclick={() => showParagraphConfirm = false} class="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors">انصراف</button>
        <button onclick={confirmAndRunParagraphTranslation}
          class="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">
          بله، شروع کن
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Export Modal -->
{#if showExportModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => showExportModal = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-card border rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-base font-semibold mb-4" dir="rtl">تنظیمات خروجی</h3>
      <div class="space-y-4" dir="rtl">

        <!-- Layer selection -->
        <div class="space-y-2">
          <span class="text-sm font-medium block">نوع ترجمه</span>
          <div class="space-y-1.5">
            <button onclick={() => exportLayer = 'layer1'}
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm transition-colors {exportLayer === 'layer1' ? 'border-primary bg-primary/5 text-primary' : 'border-input hover:bg-muted'}">
              <svg class="w-4 h-4 shrink-0 {exportLayer === 'layer1' ? 'text-primary' : 'text-transparent'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
              <div class="flex-1 text-right">
                <div class="font-medium">ترجمه تطبیقی</div>
                <div class="text-xs text-muted-foreground">ترجمه جمله‌به‌جمله و قابل مقایسه با متن اصلی</div>
              </div>
            </button>
            <button onclick={() => exportLayer = 'layer2'}
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm transition-colors {exportLayer === 'layer2' ? 'border-primary bg-primary/5 text-primary' : 'border-input hover:bg-muted'}">
              <svg class="w-4 h-4 shrink-0 {exportLayer === 'layer2' ? 'text-primary' : 'text-transparent'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
              <div class="flex-1 text-right">
                <div class="font-medium">ترجمه روان</div>
                <div class="text-xs text-muted-foreground">نسخه صیقل‌خورده و یکدست با مدل سفارشی</div>
              </div>
            </button>
            <button onclick={() => exportLayer = 'both'}
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm transition-colors {exportLayer === 'both' ? 'border-primary bg-primary/5 text-primary' : 'border-input hover:bg-muted'}">
              <svg class="w-4 h-4 shrink-0 {exportLayer === 'both' ? 'text-primary' : 'text-transparent'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
              <div class="flex-1 text-right">
                <div class="font-medium">هر دو</div>
                <div class="text-xs text-muted-foreground">ترجمه روان به عنوان اصلی + ترجمه تطبیقی زیر هر بند</div>
              </div>
            </button>
          </div>
        </div>

        <!-- Include source -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="flex items-center justify-between py-2 border-t">
          <span class="text-sm">شامل متن اصلی</span>
          <button onclick={() => exportIncludeSource = !exportIncludeSource}
            role="switch" aria-checked={exportIncludeSource} aria-label="شامل متن اصلی"
            dir="ltr"
            class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors {exportIncludeSource ? 'bg-primary' : 'bg-muted-foreground/30'}">
            <span class="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform {exportIncludeSource ? 'translate-x-4' : 'translate-x-0.5'}"></span>
          </button>
        </div>

      </div>

      <div class="flex gap-2 justify-end mt-5" dir="rtl">
        <button onclick={() => showExportModal = false} class="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors">انصراف</button>
        <button onclick={() => handleExport('markdown')}
          class="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors">
          Markdown
        </button>
        <button onclick={() => handleExport('word')}
          class="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">
          Word (.doc)
        </button>
      </div>
    </div>
  </div>
{/if}
