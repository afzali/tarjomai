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
   *   sentenceHighlight?: Record<string, number>,
   *   onSentenceHover?: (blockId: string, idx: number) => void,
   * }}
   */
  let { blocks = $bindable([]), readonly = false, onChange, hoveredBlockId = '', onHover, sentenceHighlight = {}, onSentenceHover } = $props();

  /** @type {Record<string, HTMLElement>} */
  let blockRefs = $state({});
  /** @type {string|null} */
  let slashMenuBlockId = $state(null);
  let slashMenuPos = $state({ top: 0, left: 0 });
  /** prevents oninput from firing after Enter keydown */
  let suppressNextInput = false;

  /**
   * Sync external content changes (e.g., from translation completion, chapter switch) 
   * to DOM only when block is NOT focused, to avoid overwriting user's in-progress typing.
   */
  $effect(() => {
    for (const block of blocks) {
      const el = blockRefs[block.id];
      if (!el) continue;
      // Skip if user is actively editing this element
      if (document.activeElement === el) continue;
      const domContent = el.textContent || '';
      if (domContent !== block.content) {
        el.textContent = block.content;
      }
    }
  });

  /** @param {string} text */
  function splitSentences(text) {
    return (text || '').split(/(?<=[.!?؟。…]\s*)|(?<=\n)/).map((/** @type {string} */ s) => s.trim()).filter(Boolean);
  }

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

  /** @param {string} id */
  async function focusBlock(id) {
    await tick();
    const el = blockRefs[id];
    el?.focus();
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
        const el = blockRefs[blocks[idx].id];
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
    focusBlock(newBlock.id);
  }

  /** @param {number} idx */
  function deleteBlock(idx) {
    if (blocks.length <= 1) {
      // Clear content instead of deleting last block
      blocks[0] = { ...blocks[0], content: '' };
      blocks = [...blocks];
      notify();
      const el = blockRefs[blocks[0].id];
      if (el) { el.textContent = ''; el.focus(); }
      return;
    }
    const focusId = idx > 0 ? blocks[idx - 1].id : blocks[1].id;
    blocks = blocks.filter((_, i) => i !== idx);
    notify();
    focusBlock(focusId);
  }

  /**
   * @param {KeyboardEvent} e
   * @param {number} idx
   */
  function handleKeydown(e, idx) {
    const el = blockRefs[blocks[idx]?.id ?? ''];
    const content = el?.textContent || '';

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      suppressNextInput = true;
      updateContent(idx, content);
      addBlockAfter(idx);
    } else if (e.key === 'Backspace' && content === '') {
      e.preventDefault();
      deleteBlock(idx);
    } else if (e.key === '/') {
      const rect = el?.getBoundingClientRect();
      if (rect) {
        slashMenuBlockId = blocks[idx].id;
        slashMenuPos = { top: rect.bottom + 4, left: rect.left };
      }
    } else if (e.key === 'Escape') {
      slashMenuBlockId = null;
    } else if (e.key === 'ArrowUp' && idx > 0) {
      e.preventDefault();
      focusBlock(blocks[idx - 1].id);
    } else if (e.key === 'ArrowDown' && idx < blocks.length - 1) {
      e.preventDefault();
      focusBlock(blocks[idx + 1].id);
    }
  }

  /**
   * @param {InputEvent} e
   * @param {number} idx
   */
  function handleInput(e, idx) {
    if (suppressNextInput) { suppressNextInput = false; return; }
    // DO NOT touch blocks state here - it causes cursor jumping and double-typing.
    // DO NOT call notify() either - that would trigger parent re-render and may
    // overwrite the DOM content we just typed.
    // Sync happens on blur/Enter/paste only.
  }

  /**
   * @param {FocusEvent} e
   * @param {number} idx
   */
  function handleBlur(e, idx) {
    const el = blockRefs[blocks[idx]?.id ?? ''];
    const content = (el?.textContent || '').replace(/\n/g, '');
    // Only update with outOfSync check on blur - this is when we sync DOM to state
    if (content !== blocks[idx]?.content) {
      updateContent(idx, content);
    }
  }

  /**
   * @param {ClipboardEvent} e
   * @param {number} idx
   */
  async function handlePaste(e, idx) {
    e.preventDefault();
    // Get plain text; fall back to HTML→text if only HTML is available
    let text = e.clipboardData?.getData('text/plain') || '';
    if (!text) {
      const html = e.clipboardData?.getData('text/html') || '';
      if (html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        text = tmp.innerText || tmp.textContent || '';
      }
    }
    if (!text) return;

    // Normalize line endings and split into paragraphs.
    // A paragraph break = one or more blank lines OR a single newline that separates distinct lines.
    // We treat any run of \n (1 or more) as a paragraph separator, since pasting
    // from a word processor typically gives one \n per paragraph.
    const normalized = text.replace(/\r\n?/g, '\n').replace(/\u00A0/g, ' ');
    const paragraphs = normalized.split(/\n+/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length === 0) return;

    // Get caret position within the current block
    const el = blockRefs[blocks[idx]?.id ?? ''];
    const currentContent = el?.textContent || '';
    let caretOffset = currentContent.length;
    if (el) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const preCaret = range.cloneRange();
        preCaret.selectNodeContents(el);
        preCaret.setEnd(range.endContainer, range.endOffset);
        caretOffset = preCaret.toString().length;
      }
    }
    const beforeCaret = currentContent.slice(0, caretOffset);
    const afterCaret = currentContent.slice(caretOffset);

    if (paragraphs.length === 1) {
      // Single paragraph: insert inline at caret, keep existing block
      const newContent = beforeCaret + paragraphs[0] + afterCaret;
      blocks[idx] = { ...blocks[idx], content: newContent };
      blocks = [...blocks];
      // Force DOM update (this block is focused, so $effect would skip it)
      if (el) {
        el.textContent = newContent;
        // Restore caret to after the inserted text
        await tick();
        placeCaretAtOffset(el, beforeCaret.length + paragraphs[0].length);
      }
      notify();
      return;
    }

    // Multi-paragraph paste: 
    // - First paragraph merges into current block (beforeCaret + paragraphs[0])
    // - Middle paragraphs become standalone blocks
    // - Last paragraph merges with afterCaret into its own block
    const before = blocks.slice(0, idx);
    const after = blocks.slice(idx + 1);
    const firstBlock = { ...blocks[idx], content: beforeCaret + paragraphs[0] };
    const middleBlocks = paragraphs.slice(1, -1).map(p => (/** @type {Block} */ ({
      id: uid(), type: 'paragraph', content: p, status: 'pending'
    })));
    const lastBlock = /** @type {Block} */ ({
      id: uid(), type: 'paragraph',
      content: paragraphs[paragraphs.length - 1] + afterCaret,
      status: 'pending'
    });

    blocks = [...before, firstBlock, ...middleBlocks, lastBlock, ...after];
    notify();

    // Force DOM update for the first block (it's focused; $effect will skip it)
    if (el) el.textContent = firstBlock.content;
    // Focus the last pasted block and place caret at end of pasted content
    await tick();
    const lastEl = blockRefs[lastBlock.id];
    if (lastEl) {
      placeCaretAtOffset(lastEl, paragraphs[paragraphs.length - 1].length);
    }
  }

  /** @param {HTMLElement} el @param {number} offset */
  function placeCaretAtOffset(el, offset) {
    el.focus();
    const range = document.createRange();
    const sel = window.getSelection();
    const textNode = el.firstChild;
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      const len = (textNode.nodeValue || '').length;
      range.setStart(textNode, Math.min(offset, len));
      range.collapse(true);
    } else {
      range.selectNodeContents(el);
      range.collapse(false);
    }
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  /**
   * @param {string} blockId
   * @param {string} type
   */
  function changeBlockType(blockId, type) {
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return;
    const content = blocks[idx].content.replace(/^\/\S*\s?/, '');
    blocks[idx] = { ...blocks[idx], type: /** @type {Block['type']} */ (type), content };
    blocks = [...blocks];
    slashMenuBlockId = null;
    notify();
    focusBlock(blockId);
  }

  /** @param {string} blockId */
  function deleteBlockById(blockId) {
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx !== -1) { slashMenuBlockId = null; deleteBlock(idx); }
  }

  /**
   * Detect which sentence index is under the mouse pointer for a block.
   * @param {MouseEvent} e
   * @param {string} blockId
   */
  function detectSentenceHover(e, blockId) {
    if (!onSentenceHover) return;
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const sentences = splitSentences(block.content);
    if (sentences.length <= 1) { onSentenceHover(blockId, 0); return; }
    /** @type {any} */
    const doc = document;
    let charOffset = 0;
    if (doc.caretPositionFromPoint) {
      const pos = doc.caretPositionFromPoint(e.clientX, e.clientY);
      charOffset = pos?.offset ?? 0;
    } else if (doc.caretRangeFromPoint) {
      const r = doc.caretRangeFromPoint(e.clientX, e.clientY);
      charOffset = r?.startOffset ?? 0;
    }
    let cum = 0;
    for (let i = 0; i < sentences.length; i++) {
      cum += sentences[i].length + 1;
      if (charOffset < cum) { onSentenceHover(blockId, i); return; }
    }
    onSentenceHover(blockId, sentences.length - 1);
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

        <!-- Sentence highlight overlay (translation→source sync) -->
        {#if sentenceHighlight[block.id] !== undefined && sentenceHighlight[block.id] >= 0}
          {@const sentences = splitSentences(block.content)}
          {@const hi = sentenceHighlight[block.id]}
          <div class={blockClasses(block) + ' absolute inset-0 pointer-events-none select-none'} aria-hidden="true">{#each sentences as sent, si}<span class="rounded px-0.5 {si === hi ? 'bg-yellow-200 dark:bg-yellow-800/60' : ''}">{sent} </span>{/each}</div>
        {/if}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <!-- NOTE: NO reactive {block.content} inside - $effect syncs DOM when needed.
             This prevents Svelte from overwriting user's in-progress typing. -->
        <div
          bind:this={blockRefs[block.id]}
          contenteditable={!readonly}
          dir="auto"
          class={blockClasses(block) + (sentenceHighlight[block.id] !== undefined && sentenceHighlight[block.id] >= 0 ? ' text-transparent caret-current' : '')}
          data-placeholder={block.content === '' ? (block.type === 'paragraph' ? 'بنویسید یا / بزنید برای دستورات...' : block.type) : ''}
          data-empty={block.content === '' ? 'true' : 'false'}
          onkeydown={(e) => handleKeydown(e, idx)}
          oninput={(e) => handleInput(/** @type {any} */ (e), idx)}
          onblur={(e) => handleBlur(/** @type {any} */ (e), idx)}
          onpaste={(e) => handlePaste(/** @type {any} */ (e), idx)}
          onmousemove={(e) => detectSentenceHover(/** @type {MouseEvent} */ (e), block.id)}
          onmouseleave={() => onSentenceHover?.(block.id, -1)}
        ></div>
      </div>
    </div>
  {/each}

  <!-- Add first block button if empty -->
  {#if blocks.length === 0 && !readonly}
    <button
      class="w-full text-right text-sm text-muted-foreground px-3 py-2 rounded hover:bg-muted/30 transition-colors"
      onclick={() => { const b = { id: uid(), type: 'paragraph', content: '', status: 'pending' }; blocks = [b]; notify(); focusBlock(b.id); }}
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
    <div class="border-t my-1"></div>
    <button
      class="w-full text-right px-3 py-1.5 hover:bg-destructive/10 text-destructive flex items-center gap-2"
      onclick={() => deleteBlockById(slashMenuBlockId ?? '')}
    >
      <svg class="w-3.5 h-3.5 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      <span>حذف بند</span>
    </button>
  </div>
{/if}

<style>
  [contenteditable][data-empty='true']::before {
    content: attr(data-placeholder);
    color: hsl(var(--muted-foreground) / 0.5);
    pointer-events: none;
  }
</style>
