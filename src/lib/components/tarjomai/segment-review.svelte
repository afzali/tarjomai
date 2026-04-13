<script>
  import DiffView from '$lib/components/tarjomai/diff-view.svelte';

  /**
   * @typedef {{ index: number, sourceText: string, outputText: string, status: 'pending'|'edited', editedText: string|null }} Segment
   */

  /**
   * @type {{
   *   segment: Segment,
   *   isProcessing?: boolean,
   *   hideSource?: boolean,
   *   showDiff?: boolean,
   *   onEdit?: (index: number, newText: string) => void,
   *   onChatAbout?: (text: string) => void,
   * }}
   */
  let { segment, isProcessing = false, hideSource = false, showDiff = true, onEdit, onChatAbout } = $props();

  let editMode = $state(false);
  let editedValue = $state('');
  let showSelectionButton = $state(false);
  let selectionButtonPos = $state({ x: 0, y: 0 });
  let selectedTextValue = $state('');

  const isEdited = $derived(segment.status === 'edited');

  const displayOutput = $derived(
    isEdited ? (segment.editedText || segment.outputText) : segment.outputText
  );

  function startEdit() {
    editedValue = isEdited ? (segment.editedText || segment.outputText) : segment.outputText;
    editMode = true;
  }

  function saveEdit() {
    onEdit?.(segment.index, editedValue);
    editMode = false;
  }

  function cancelEdit() { editMode = false; }

  function handleTextSelection(e) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { showSelectionButton = false; return; }
    const text = sel.toString().trim();
    if (text.length > 0) {
      selectedTextValue = text;
      showSelectionButton = true;
      selectionButtonPos = { x: e.clientX, y: e.clientY };
    } else {
      showSelectionButton = false;
    }
  }

  function triggerChatAbout() {
    onChatAbout?.(selectedTextValue);
    showSelectionButton = false;
    window.getSelection()?.removeAllRanges();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="group relative" onmouseup={handleTextSelection}>
  <!-- Source text (hidden in side-by-side mode) -->
  {#if !hideSource}
    <div class="mb-3 pb-3 border-b">
      <p class="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground" dir="auto">{segment.sourceText}</p>
    </div>
  {/if}

  <!-- Output area -->
  {#if isProcessing && !segment.outputText}
    <div class="space-y-2 py-1">
      <div class="h-3 bg-muted animate-pulse rounded w-4/5"></div>
      <div class="h-3 bg-muted animate-pulse rounded w-3/5"></div>
      <div class="h-3 bg-muted animate-pulse rounded w-4/5"></div>
    </div>
  {:else if editMode}
    <!-- Inline edit — save/cancel bar on top, contenteditable below -->
    <div class="flex items-center gap-1.5 pt-1 pb-1">
      <button onclick={saveEdit}
        class="h-6 px-2.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">ذخیره</button>
      <button onclick={cancelEdit}
        class="h-6 px-2.5 rounded border border-input bg-background text-xs hover:bg-muted transition-colors">لغو</button>
    </div>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      contenteditable="true"
      bind:textContent={editedValue}
      dir="auto"
      class="text-sm px-0 pb-1 leading-relaxed whitespace-pre-wrap outline-none caret-primary min-h-[2rem]"
    ></div>
  {:else if displayOutput}
    <div class="relative">
      {#if !isProcessing}
        <button onclick={startEdit}
          class="absolute -top-1 -left-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-muted"
          title="ویرایش (یا دابل‌کلیک)" aria-label="ویرایش دستی">
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        </button>
      {/if}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div ondblclick={() => !isProcessing && startEdit()}>
        {#if isEdited}
          <p class="text-sm leading-relaxed whitespace-pre-wrap" dir="auto">{displayOutput}</p>
        {:else if segment.outputText && showDiff}
          <DiffView source={segment.sourceText} output={segment.outputText} side="output" />
        {:else if segment.outputText}
          <p class="text-sm leading-relaxed whitespace-pre-wrap" dir="auto">{segment.outputText}</p>
        {:else}
          <p class="text-sm text-muted-foreground italic">در انتظار پردازش...</p>
        {/if}
      </div>
    </div>
  {:else}
    <p class="text-sm text-muted-foreground italic">در انتظار پردازش...</p>
  {/if}
</div>

<!-- Floating "chat about" button on text selection -->
{#if showSelectionButton}
  <div class="fixed z-50" style="top: {selectionButtonPos.y - 40}px; left: {selectionButtonPos.x - 60}px;">
    <button onclick={triggerChatAbout}
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-md hover:bg-primary/90 transition-colors">
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      چت
    </button>
  </div>
{/if}
