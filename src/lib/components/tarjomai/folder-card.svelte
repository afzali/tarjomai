<script>
  /**
   * @type {{
   *   folder: any,
   *   projectCount?: number,
   *   onOpen?: (id: number) => void,
   *   onRename?: (id: number) => void,
   *   onDelete?: (id: number) => void,
   * }}
   */
  let { folder, projectCount = 0, onOpen, onRename, onDelete } = $props();

  let showMenu = $state(false);

  function handleClick() {
    onOpen?.(folder.id);
  }

  function toggleMenu(e) {
    e.stopPropagation();
    showMenu = !showMenu;
  }

  function handleRename(e) {
    e.stopPropagation();
    showMenu = false;
    onRename?.(folder.id);
  }

  function handleDelete(e) {
    e.stopPropagation();
    showMenu = false;
    onDelete?.(folder.id);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="group relative flex items-center gap-3 p-3 rounded-xl border bg-card hover:shadow-sm hover:border-primary/30 cursor-pointer transition-all"
  onclick={handleClick}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Enter' && handleClick()}
>
  <!-- Folder icon -->
  <div class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0">
    <svg class="w-5 h-5 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  </div>

  <!-- Name + count -->
  <div class="flex-1 min-w-0">
    <p class="text-sm font-medium truncate">{folder.name}</p>
    <p class="text-xs text-muted-foreground">{projectCount} پروژه</p>
  </div>

  <!-- Context menu button -->
  <div class="relative">
    <button
      onclick={toggleMenu}
      class="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-all"
      aria-label="گزینه‌ها"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
      </svg>
    </button>

    {#if showMenu}
      <!-- Click outside to close -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="fixed inset-0 z-10"
        onclick={() => showMenu = false}
      ></div>
      <div class="absolute left-0 top-8 z-20 w-40 bg-popover border rounded-lg shadow-md py-1 text-sm">
        <button onclick={handleRename} class="w-full text-right px-3 py-2 hover:bg-muted transition-colors flex items-center gap-2">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
          تغییر نام
        </button>
        <button onclick={handleDelete} class="w-full text-right px-3 py-2 hover:bg-destructive/10 text-destructive transition-colors flex items-center gap-2">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          حذف
        </button>
      </div>
    {/if}
  </div>
</div>
