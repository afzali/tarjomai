<script>
  import { tick } from 'svelte';

  /**
   * @typedef {{ id: string, type: string, content: string, outputText?: string, editedText?: string|null, status?: string, outOfSync?: boolean, _editing?: boolean, _editVal?: string }} Block
   */

  /**
   * @type {{
   *   blocks: Block[],
   *   readonly?: boolean,
   *   onChange?: (blocks: Block[]) => void,
   *   hoveredBlockId?: string,
   *   onHover?: (id: string) => void,
   * }}
   */
  let { blocks = $bindable([]), readonly = false, onChange, hoveredBlockId = '', onHover } = $props();

  /** @type {HTMLElement[]} */
  let blockRefs = $state([]);
  /** @type {string|null} */
  let slashMenuBlockId = $state(null);
  let slashMenuPos = $state({ top: 0, left: 0 });

  const BLOCK_TYPES = [
    { type: 'paragraph', label: 'متن عادی', icon: '¶' },
    { type: 'h1', label: 'عنوان ۱', icon: 'H1' },
    { type: 'h2', label: 'عنوان ۲', icon: 'H2' },
    { type: 'h3', label: 'عنوان ۳', icon: 'H3' },
    { type: 'quote', label: 'نقل‌قول', icon: '❝' },
    { type: 'bullet', label: 'گلوله', icon: '•' },
  ];

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function notify() {
    onChange?.(blocks);
  }

  /** @param {number} idx */
  async function focusBlock(idx) {
    await tick();
    blockRefs[idx]?.focus();
    // Move cursor to end
    const el = blockRefs[idx];
    if (el) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
  }

  /** @param {number} idx @param {string} content */
  function updateContent(idx, content) {
    const hadOutput = !!(blocks[idx].outputText);
    const willGoOutOfSync = hadOutput && blocks[idx].content !== content;
    if (willGoOutOfSync && !blocks[idx].outOfSync) {
      if (!confirm('این بند خروجی AI دارد. با ویرایش، خروجی از سینک خارج می‌شود. ادامه می‌دهید؟')) {
        // Restore original content in DOM
        const el = blockRefs[idx];
        if (el) el.textContent = blocks[idx].content;
        return;
      }
    }
    blocks[idx] = { ...blocks[idx], content, outOfSync: hadOutput ? true : false };
    blocks = [...blocks];
    notify();
  }

  /** @param {number} idx */
  function addBlockAfter(idx) {
    const newBlock = /** @type {Block} */ ({ id: uid(), type: 'paragraph', content: '', status: 'pending' });
    blocks = [...blocks.slice(0, idx + 1), newBlock, ...blocks.slice(idx + 1)];
    notify();
    focusBlock(idx + 1);
  }

  /** @param {number} idx */
  function deleteBlock(idx) {
    if (blocks.length <= 1) {
      // Clear content instead of deleting last block
      blocks[0] = { ...blocks[0], content: '' };
      blocks = [...blocks];
      notify();
      return;
    }
    blocks = blocks.filter((_, i) => i !== idx);
    notify();
    focusBlock(Math.max(0, idx - 1));
  }

  /**
   * @param {KeyboardEvent} e
   * @param {number} idx
   */
  function handleKeydown(e, idx) {
    const el = blockRefs[idx];
    const content = el?.textContent || '';

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Commit current content
      updateContent(idx, content);
      addBlockAfter(idx);
    } else if (e.key === 'Backspace' && content === '') {
      e.preventDefault();
      deleteBlock(idx);
    } else if (e.key === '/') {
      // Show slash menu
      const rect = el?.getBoundingClientRect();
      if (rect) {
        slashMenuBlockId = blocks[idx].id;
        slashMenuPos = { top: rect.bottom + 4, left: rect.left };
      }
    } else if (e.key === 'Escape') {
      slashMenuBlockId = null;
    } else if (e.key === 'ArrowUp' && idx > 0) {
      e.preventDefault();
      focusBlock(idx - 1);
    } else if (e.key === 'ArrowDown' && idx < blocks.length - 1) {
      e.preventDefault();
      focusBlock(idx + 1);
    }
  }

  /**
   * @param {InputEvent} e
   * @param {number} idx
   */
  function handleInput(e, idx) {
    const el = blockRefs[idx];
    updateContent(idx, el?.textContent || '');
  }

  /**
   * @param {string} blockId
   * @param {string} type
   */
  function changeBlockType(blockId, type) {
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return;
    // Strip slash if user typed it
    const content = blocks[idx].content.replace(/^\/\S*\s?/, '');
    blocks[idx] = { ...blocks[idx], type: /** @type {Block['type']} */ (type), content };
    blocks = [...blocks];
    slashMenuBlockId = null;
    notify();
    focusBlock(idx);
  }

  /** @param {Block} block */
  function blockClasses(block) {
    const base = 'outline-none break-words whitespace-pre-wrap min-h-[1.5em] w-full';
    switch (block.type) {
      case 'h1': return base + ' text-2xl font-bold';
      case 'h2': return base + ' text-xl font-semibold';
      case 'h3': return base + ' text-lg font-medium';
      case 'quote': return base + ' italic text-muted-foreground border-r-4 border-muted-foreground/30 pr-3';
      case 'bullet': return base + ' pl-0';
      default: return base + ' text-sm leading-relaxed';
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="block-editor" onclick={() => { if (slashMenuBlockId) slashMenuBlockId = null; }}>
  {#each blocks as block, idx (block.id)}
    <div
      class="group/block relative flex items-start gap-2 py-0.5 px-1 rounded transition-colors
        {hoveredBlockId === block.id ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/20'}"
      onmouseenter={() => onHover?.(block.id)}
      onmouseleave={() => onHover?.('')}
    >
      <!-- Block type handle + add button -->
      {#if !readonly}
        <div class="flex flex-col items-center opacity-0 group-hover/block:opacity-100 transition-opacity pt-0.5 shrink-0 gap-0.5">
          <!-- Drag handle (visual only) -->
          <button
            class="p-0.5 rounded text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted cursor-grab"
            title="نوع بلاک / کشیدن"
            tabindex="-1"
            onclick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); slashMenuBlockId = block.id; slashMenuPos = { top: rect.bottom + 4, left: rect.left }; }}
          >
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
          </button>
          <!-- Add block below -->
          <button
            class="p-0.5 rounded text-muted-foreground/50 hover:text-primary hover:bg-primary/10"
            title="اضافه کردن بلاک"
            tabindex="-1"
            onclick={(e) => { e.stopPropagation(); addBlockAfter(idx); }}
          >
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      {/if}

      <!-- Block content -->
      <div class="flex-1 relative">
        {#if block.type === 'bullet'}
          <span class="absolute -right-4 top-1 text-muted-foreground select-none" aria-hidden="true">•</span>
        {/if}

        {#if block.outOfSync}
          <span class="absolute -top-1 right-0 text-[9px] text-amber-500 font-medium leading-none">● out-of-sync</span>
        {/if}

        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          bind:this={blockRefs[idx]}
          contenteditable={!readonly}
          dir="auto"
          class={blockClasses(block)}
          data-placeholder={block.content === '' ? (block.type === 'paragraph' ? 'بنویسید یا / بزنید برای دستورات...' : block.type) : ''}
          onkeydown={(e) => handleKeydown(e, idx)}
          oninput={(e) => handleInput(/** @type {any} */ (e), idx)}
        >{block.content}</div>
      </div>
    </div>
  {/each}

  <!-- Add first block button if empty -->
  {#if blocks.length === 0 && !readonly}
    <button
      class="w-full text-right text-sm text-muted-foreground px-3 py-2 rounded hover:bg-muted/30 transition-colors"
      onclick={() => { blocks = [{ id: uid(), type: 'paragraph', content: '', status: 'pending' }]; notify(); focusBlock(0); }}
    >
      + بلاک جدید
    </button>
  {/if}
</div>

<!-- Slash menu -->
{#if slashMenuBlockId}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed z-50 w-48 rounded-lg border bg-popover shadow-lg py-1 text-sm"
    style="top: {slashMenuPos.top}px; left: {slashMenuPos.left}px;"
    onmouseleave={() => slashMenuBlockId = null}
  >
    {#each BLOCK_TYPES as t}
      <button
        class="w-full text-right px-3 py-1.5 hover:bg-muted flex items-center gap-2"
        onclick={() => changeBlockType(slashMenuBlockId ?? '', t.type)}
      >
        <span class="font-mono text-xs text-muted-foreground w-5">{t.icon}</span>
        <span>{t.label}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  [contenteditable]:empty::before {
    content: attr(data-placeholder);
    color: hsl(var(--muted-foreground) / 0.5);
    pointer-events: none;
  }
</style>
