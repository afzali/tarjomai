<script>
  import { goto } from '$app/navigation';
  import FileTypeIcon from './file-type-icon.svelte';
  import { getFileType } from '$lib/operations/fileTypes.js';
  import { getOperation } from '$lib/operations/index.js';

  /**
   * @type {{
   *   project: any,
   *   selectMode?: boolean,
   *   selected?: boolean,
   *   onSelect?: (id: number) => void,
   *   onDelete?: (id: number) => void,
   *   onMove?: (id: number) => void,
   * }}
   */
  let { project, selectMode = false, selected = false, onSelect, onDelete, onMove } = $props();

  const fileType = $derived(getFileType(project.operationType || 'translation'));
  const operation = $derived(getOperation(project.operationType || 'translation'));

  function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fa-IR');
  }

  function handleCardClick() {
    if (selectMode) {
      onSelect?.(project.id);
    }
  }

  function handleOpen(e) {
    e.stopPropagation();
    goto(operation.workspaceUrl(project.id));
  }

  const isSetupIncomplete = $derived(project.setupStep && project.setupStep !== 'completed');
</script>

<div
  role={selectMode ? 'button' : undefined}
  tabindex={selectMode ? 0 : undefined}
  onclick={handleCardClick}
  onkeydown={selectMode ? (e) => e.key === 'Enter' && handleCardClick() : undefined}
  class="
    group relative flex flex-col gap-0 rounded-xl border bg-card shadow-sm transition-all
    hover:shadow-md hover:border-primary/30
    {selectMode ? 'cursor-pointer' : ''}
    {selected ? 'ring-2 ring-primary border-primary/40' : ''}
  "
>
  <!-- Top color stripe based on file type -->
  <div class="h-1 rounded-t-xl {fileType.bgClass} opacity-70"></div>

  <div class="p-4 flex flex-col gap-3 flex-1">
    <!-- Header row -->
    <div class="flex items-start gap-3">
      <FileTypeIcon operationType={project.operationType || 'translation'} size="md" />

      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-1">
          <h3 class="font-semibold text-sm leading-snug line-clamp-2 flex-1">{project.title}</h3>
          {#if selectMode}
            <div class="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors
              {selected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'}">
              {#if selected}
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              {/if}
            </div>
          {:else}
            <!-- Delete button (hover) -->
            <button
              onclick={(e) => { e.stopPropagation(); onDelete?.(project.id); }}
              class="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
              aria-label="حذف پروژه"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          {/if}
        </div>

        <!-- File type badge + extension -->
        <div class="flex items-center gap-1.5 mt-1">
          <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono {fileType.badgeClass}">
            {fileType.extension}
          </span>
          <span class="text-xs text-muted-foreground">{fileType.label}</span>
        </div>
      </div>
    </div>

    <!-- Description -->
    {#if project.description}
      <p class="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
    {/if}

    <!-- Meta info -->
    <div class="flex items-center justify-between text-xs text-muted-foreground">
      {#if project.sourceLanguage && project.targetLanguage}
        <span>{project.sourceLanguage} → {project.targetLanguage}</span>
      {:else if project.sourceLanguage}
        <span>{project.sourceLanguage}</span>
      {:else}
        <span></span>
      {/if}
      <span>{formatDate(project.updatedAt)}</span>
    </div>

    <!-- Setup incomplete warning -->
    {#if isSetupIncomplete}
      <div class="px-2 py-1 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
        <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <path d="M12 9v4" /><path d="M12 17h.01" />
        </svg>
        راه‌اندازی ناقص
      </div>
    {/if}

    <!-- Actions (non-select mode) -->
    {#if !selectMode}
      <div class="flex gap-2 mt-auto pt-1">
        <button
          onclick={handleOpen}
          class="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium
                 border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          ادامه کار
        </button>
        {#if onMove}
          <button
            onclick={(e) => { e.stopPropagation(); onMove?.(project.id); }}
            class="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
            aria-label="انتقال به پوشه"
            title="انتقال به پوشه"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            </svg>
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>
