<script>
  import { onMount, tick } from 'svelte';
  import { reviewService } from '$lib/services/review.service.js';
  import { openrouterService } from '$lib/services/openrouter.service.js';
  import { allModels, getModelName } from '$lib/models.js';
  import { fetchModels } from '$lib/stores/models.store.js';
  import { marked } from 'marked';
  import * as Select from '$lib/components/ui-rtl/select';

  /**
   * @typedef {Object} ReviewPanelProps
   * @property {number} chapterId
   * @property {number} [projectId]
   * @property {string} [operationType] - 'translation' | 'editorial'
   * @property {string} [sourceText]
   * @property {string} [outputText]
   * @property {string} [apiKey]
   * @property {string} [defaultModel]
   * @property {string} [quote] - pre-filled quote text for the input
   * @property {() => void} [onClose]
   */

  /** @type {ReviewPanelProps} */
  let {
    chapterId,
    projectId = null,
    operationType = 'translation',
    sourceText = '',
    outputText = '',
    apiKey = '',
    defaultModel = 'google/gemini-flash-1.5',
    quote = $bindable(''),
    onClose = null
  } = $props();

  let messages = $state([]);
  let input = $state('');
  let reviewing = $state(false);
  let chatEl = $state(null);
  let model = $state(defaultModel);
  let availableModels = $state(allModels);
  let modelSearch = $state('');
  let showModelDropdown = $state(false);

  const modelLabel = $derived(
    availableModels.find(m => m.id === model)?.name || model
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

  onMount(async () => {
    messages = await reviewService.getMessages(chapterId);
    await scrollToBottom();
    if (apiKey) {
      fetchModels(apiKey).then(m => { availableModels = m; });
    }
  });

  $effect(() => {
    if (quote) {
      input = quote;
      quote = '';
    }
  });

  $effect(() => {
    if (defaultModel) model = defaultModel;
  });

  async function scrollToBottom() {
    await tick();
    chatEl?.scrollTo({ top: chatEl.scrollHeight });
  }

  function buildSystemPrompt() {
    if (operationType === 'editorial') {
      return `تو یک ویراستار و مصحح حرفه‌ای هستی. متن اصلی و نسخه ویرایش‌شده به تو داده می‌شود. به سوالات کاربر پاسخ بده.

متن اصلی:
${(sourceText || '').substring(0, 2000)}

نسخه ویرایش‌شده:
${(outputText || '').substring(0, 2000)}`;
    }
    return `تو یک مترجم و ویراستار حرفه‌ای هستی. متن اصلی و ترجمه آن به تو داده می‌شود. به سوالات کاربر پاسخ بده و ترجمه را بررسی کن.

متن اصلی:
${(sourceText || '').substring(0, 2000)}

ترجمه:
${(outputText || '').substring(0, 2000)}`;
  }

  async function send() {
    if (!input.trim() || reviewing || !chapterId) return;

    const userMsg = input.trim();
    input = '';
    reviewing = true;

    await reviewService.addMessage(chapterId, 'user', userMsg);
    messages = await reviewService.getMessages(chapterId);
    await scrollToBottom();

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const result = await openrouterService.sendMessage(
        apiKey,
        model,
        [{ role: 'system', content: buildSystemPrompt() }, ...history]
      );

      const content = result.content || result.error || 'خطا در دریافت پاسخ';
      await reviewService.addMessage(chapterId, 'assistant', content, model);
      messages = await reviewService.getMessages(chapterId);
      await scrollToBottom();
    } catch (e) {
      await reviewService.addMessage(chapterId, 'assistant', 'خطا: ' + e.message);
      messages = await reviewService.getMessages(chapterId);
    } finally {
      reviewing = false;
    }
  }

  async function clearChat() {
    await reviewService.clearMessages(chapterId);
    messages = [];
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function renderMarkdown(text) {
    try { return marked.parse(text || ''); } catch { return text || ''; }
  }
</script>

<div class="flex flex-col h-full bg-card" dir="rtl">
  <!-- Header -->
  <div class="p-3 border-b flex items-center justify-between gap-2 shrink-0">
    <span class="text-sm font-medium">بررسی و گفتگو</span>
    <div class="flex items-center gap-2">
      <!-- Model selector with search -->
      <div class="relative">
        <button
          onclick={() => { showModelDropdown = !showModelDropdown; modelSearch = ''; }}
          class="h-7 text-xs px-2 rounded-md border border-input bg-background max-w-36 truncate hover:bg-muted transition-colors"
          title={modelLabel}
        >
          {modelLabel}
        </button>
        {#if showModelDropdown}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="absolute left-0 top-8 z-50 w-64 rounded-xl border bg-popover shadow-lg"
            onmouseleave={() => showModelDropdown = false}
          >
            <div class="p-2 border-b">
              <input
                type="text"
                bind:value={modelSearch}
                placeholder="جستجوی مدل..."
                dir="rtl"
                class="w-full h-7 text-xs px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
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

      {#if messages.length > 0}
        <button
          onclick={clearChat}
          class="text-xs text-muted-foreground hover:text-destructive transition-colors px-1.5"
          title="پاک کردن گفتگو"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </button>
      {/if}

      {#if onClose}
        <button
          onclick={onClose}
          class="text-muted-foreground hover:text-foreground transition-colors"
          title="بستن"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <!-- Messages -->
  <div class="flex-1 overflow-y-auto p-3 space-y-3 min-h-0" bind:this={chatEl}>
    {#if messages.length === 0}
      <p class="text-xs text-muted-foreground text-center mt-6">
        سوال یا نظر خود را بنویسید...
      </p>
    {:else}
      {#each messages as msg (msg.id)}
        <div class="flex {msg.role === 'user' ? 'justify-start' : 'justify-end'}">
          <div
            class="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed
              {msg.role === 'user'
                ? 'bg-muted text-foreground'
                : 'bg-primary text-primary-foreground'}"
          >
            {#if msg.role === 'assistant'}
              <div class="prose prose-xs dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                {@html renderMarkdown(msg.content)}
              </div>
            {:else}
              <div class="whitespace-pre-wrap break-words">{msg.content}</div>
            {/if}
            {#if msg.model}
              <div class="text-[10px] mt-1 opacity-60">{getModelName(msg.model)}</div>
            {/if}
          </div>
        </div>
      {/each}

      {#if reviewing}
        <div class="flex justify-end">
          <div class="bg-primary/20 rounded-xl px-3 py-2">
            <div class="flex gap-1">
              <div class="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]"></div>
              <div class="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]"></div>
              <div class="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]"></div>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Input -->
  <div class="p-3 border-t shrink-0">
    <div class="flex gap-2">
      <textarea
        bind:value={input}
        placeholder="پیام..."
        rows={2}
        dir="rtl"
        class="flex-1 text-xs p-2 rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        onkeydown={handleKeydown}
      ></textarea>
      <button
        onclick={send}
        disabled={reviewing || !input.trim()}
        class="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors self-end"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="m3 3 3 9-3 9 19-9Z"/><path d="M6 12h16"/>
        </svg>
      </button>
    </div>
  </div>
</div>
