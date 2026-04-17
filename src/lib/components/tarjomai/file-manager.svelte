<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { projectsStore } from '$lib/stores/projects.store.js';
  import projectsService from '$lib/services/projects.service.js';
  import foldersService from '$lib/services/folders.service.js';
  import { getAllFileTypes } from '$lib/operations/fileTypes.js';
  import ProjectCard from './project-card.svelte';
  import FolderCard from './folder-card.svelte';

  // State
  let allProjects = $state([]);
  let allFolders = $state([]);
  let loading = $state(true);
  let currentFolderId = $state(null);  // null = root
  let folderPath = $state([]);         // breadcrumb

  // Filter
  let activeTypeFilter = $state('all'); // 'all' | 'translation' | 'editorial' | ...
  let sortKey = $state('updatedAt_desc');

  // Select mode
  let selectMode = $state(false);
  let selectedIds = $state(new Set());
  let exporting = $state(false);
  let importing = $state(false);

  // Folder create/rename dialog
  let showFolderDialog = $state(false);
  let folderDialogMode = $state('create'); // 'create' | 'rename'
  let folderDialogName = $state('');
  let folderDialogTargetId = $state(null);

  // Move project dialog
  let showMoveDialog = $state(false);
  let moveProjectId = $state(null);

  // Delete confirm dialog
  let showDeleteDialog = $state(false);
  /** @type {'folder'|'project'} */
  let deleteDialogType = $state('project');
  let deleteDialogId = $state(/** @type {number|null} */ (null));
  let deleteDialogName = $state('');

  const fileTypes = getAllFileTypes();

  const sortOptions = [
    { value: 'updatedAt_desc', label: 'آخرین ویرایش (جدید)' },
    { value: 'updatedAt_asc',  label: 'آخرین ویرایش (قدیم)' },
    { value: 'createdAt_desc', label: 'تاریخ ساخت (جدید)' },
    { value: 'createdAt_asc',  label: 'تاریخ ساخت (قدیم)' },
    { value: 'title_asc',      label: 'نام (الف تا ی)' },
    { value: 'title_desc',     label: 'نام (ی تا الف)' },
  ];

  // Derived: folders in current level — sorted by name matching sortKey direction
  const currentFolders = $derived(() => {
    const list = allFolders.filter(f => f.parentId === currentFolderId);
    const [field, dir] = sortKey.split('_');
    return [...list].sort((a, b) => {
      if (field === 'title') {
        const cmp = (a.name || '').localeCompare(b.name || '', 'fa');
        return dir === 'asc' ? cmp : -cmp;
      }
      // For date sorts, sort folders by updatedAt/createdAt
      const da = new Date(a[field] || 0).getTime();
      const db = new Date(b[field] || 0).getTime();
      return dir === 'desc' ? db - da : da - db;
    });
  });

  // Derived: projects in current level filtered by type
  const currentProjects = $derived(() => {
    let list = allProjects.filter(p => (p.folderId ?? null) === currentFolderId);
    if (activeTypeFilter !== 'all') {
      list = list.filter(p => (p.operationType || 'translation') === activeTypeFilter);
    }
    const [field, dir] = sortKey.split('_');
    list.sort((a, b) => {
      if (field === 'title') {
        const cmp = (a.title || '').localeCompare(b.title || '', 'fa');
        return dir === 'asc' ? cmp : -cmp;
      }
      const da = new Date(a[field] || 0).getTime();
      const db = new Date(b[field] || 0).getTime();
      return dir === 'desc' ? db - da : da - db;
    });
    return list;
  });

  // Project count per folder (for badges)
  const folderProjectCounts = $derived(
    Object.fromEntries(
      allFolders.map(f => [f.id, allProjects.filter(p => p.folderId === f.id).length])
    )
  );

  onMount(async () => {
    await loadAll();
    loading = false;
  });

  $effect(() => {
    const unsub = projectsStore.subscribe(value => {
      allProjects = value;
    });
    return unsub;
  });

  async function loadAll() {
    const [projects, folders] = await Promise.all([
      projectsStore.load(),
      foldersService.getAllFolders()
    ]);
    allProjects = projects;
    allFolders = folders;
  }

  async function openFolder(folderId) {
    const folder = allFolders.find(f => f.id === folderId);
    if (!folder) return;
    currentFolderId = folderId;
    const parentPath = await foldersService.getFolderPath(folderId);
    folderPath = parentPath;
  }

  function navigateToRoot() {
    currentFolderId = null;
    folderPath = [];
  }

  async function navigateToBreadcrumb(folderId) {
    if (folderId === null) {
      navigateToRoot();
    } else {
      await openFolder(folderId);
    }
  }

  // Folder CRUD
  function openCreateFolder() {
    folderDialogMode = 'create';
    folderDialogName = '';
    folderDialogTargetId = null;
    showFolderDialog = true;
  }

  function openRenameFolder(id) {
    const folder = allFolders.find(f => f.id === id);
    if (!folder) return;
    folderDialogMode = 'rename';
    folderDialogName = folder.name;
    folderDialogTargetId = id;
    showFolderDialog = true;
  }

  async function submitFolderDialog() {
    const name = folderDialogName.trim();
    if (!name) return;
    if (folderDialogMode === 'create') {
      const folder = await foldersService.createFolder(name, currentFolderId);
      allFolders = [...allFolders, folder];
    } else if (folderDialogMode === 'rename' && folderDialogTargetId) {
      await foldersService.updateFolder(folderDialogTargetId, { name });
      allFolders = allFolders.map(f => f.id === folderDialogTargetId ? { ...f, name } : f);
    }
    showFolderDialog = false;
  }

  function openDeleteFolder(id) {
    const folder = allFolders.find(f => f.id === id);
    if (!folder) return;
    deleteDialogType = 'folder';
    deleteDialogId = id;
    deleteDialogName = folder.name;
    showDeleteDialog = true;
  }

  function openDeleteProject(id) {
    const project = allProjects.find(p => p.id === id);
    if (!project) return;
    deleteDialogType = 'project';
    deleteDialogId = id;
    deleteDialogName = project.title || 'پروژه';
    showDeleteDialog = true;
  }

  async function confirmDelete() {
    if (!deleteDialogId) return;
    if (deleteDialogType === 'folder') {
      await foldersService.deleteFolder(deleteDialogId);
      allFolders = allFolders.filter(f => f.id !== deleteDialogId);
      allProjects = await projectsStore.load();
    } else {
      await projectsStore.delete(deleteDialogId);
    }
    showDeleteDialog = false;
    deleteDialogId = null;
  }

  function openMoveDialog(id) {
    moveProjectId = id;
    showMoveDialog = true;
  }

  async function moveProjectToFolder(targetFolderId) {
    if (!moveProjectId) return;
    await projectsService.moveToFolder(moveProjectId, targetFolderId);
    allProjects = await projectsStore.load();
    showMoveDialog = false;
    moveProjectId = null;
  }

  // Select mode
  function toggleSelectMode() {
    selectMode = !selectMode;
    selectedIds = new Set();
  }

  function toggleSelect(id) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIds = next;
  }

  function selectAll() {
    selectedIds = new Set(currentProjects().map((/** @type {any} */ p) => p.id));
  }

  async function exportSelected() {
    if (selectedIds.size === 0) return;
    exporting = true;
    try {
      const ids = [...selectedIds];
      const data = await projectsService.exportProjects(ids);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const label = ids.length === 1
        ? allProjects.find(p => p.id === ids[0])?.title || 'project'
        : `tarjomai-${ids.length}-projects`;
      a.download = `${label}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      exporting = false;
    }
  }

  async function handleImport(event) {
    const file = event.target?.files?.[0];
    if (!file) return;
    importing = true;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await projectsService.importProjects(data);
      allProjects = await projectsStore.load();
      selectMode = false;
      selectedIds = new Set();
    } catch (e) {
      alert('خطا در وارد کردن فایل: ' + e.message);
    } finally {
      importing = false;
      if (event.target) event.target.value = '';
    }
  }
</script>

<div class="container mx-auto py-6 px-4" dir="rtl">
  <!-- Top Bar -->
  <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
    <div>
      <h1 class="text-2xl font-bold">ویرای</h1>
      <p class="text-sm text-muted-foreground">ویراستار هوشمند متن</p>
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      <select
        bind:value={sortKey}
        class="h-9 rounded-md border border-input bg-background px-3 text-sm"
      >
        {#each sortOptions as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
      <a href="/settings" class="inline-flex items-center gap-1.5 h-9 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors">
        تنظیمات
      </a>
      {#if !selectMode}
        <button onclick={toggleSelectMode} class="inline-flex items-center gap-1.5 h-9 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors">
          خروجی / ورودی
        </button>
        <button onclick={openCreateFolder} class="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors" title="پوشه جدید">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            <path d="M12 10v6" /><path d="M9 13h6" />
          </svg>
          پوشه
        </button>
        <a href="/projects/new{currentFolderId ? '?folderId=' + currentFolderId : ''}" class="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path d="M5 12h14" /><path d="M12 5v14" />
          </svg>
          پروژه جدید
        </a>
      {/if}
    </div>
  </div>

  <!-- File Type Filter Bar -->
  <div class="flex items-center gap-2 mb-4 flex-wrap">
    <button
      onclick={() => activeTypeFilter = 'all'}
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
             {activeTypeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}"
    >
      همه
    </button>
    {#each fileTypes as ft}
      <button
        onclick={() => activeTypeFilter = ft.id}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border
               {activeTypeFilter === ft.id ? ft.badgeClass + ' border-current/20' : 'bg-muted text-muted-foreground hover:bg-muted/80 border-transparent'}"
      >
        <span class="font-mono">{ft.extension}</span>
        {ft.label}
      </button>
    {/each}
  </div>

  <!-- Breadcrumb -->
  {#if folderPath.length > 0 || currentFolderId !== null}
    <nav class="flex items-center gap-1 text-sm mb-4" aria-label="مسیر">
      <button onclick={navigateToRoot} class="text-muted-foreground hover:text-foreground transition-colors">
        خانه
      </button>
      {#each folderPath as crumb}
        <svg class="w-4 h-4 text-muted-foreground rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
        <button
          onclick={() => navigateToBreadcrumb(crumb.id)}
          class="text-muted-foreground hover:text-foreground transition-colors"
        >
          {crumb.name}
        </button>
      {/each}
    </nav>
  {/if}

  <!-- Export/Import toolbar -->
  {#if selectMode}
    <div class="mb-4 p-3 rounded-xl border bg-muted/30 flex flex-wrap items-center gap-3">
      <span class="text-sm font-medium">
        {selectedIds.size > 0 ? `${selectedIds.size} پروژه انتخاب شده` : 'پروژه‌ها را انتخاب کنید'}
      </span>
      <div class="flex gap-2 flex-wrap">
        <button onclick={selectAll} class="inline-flex items-center h-8 px-3 rounded-md border border-input bg-background text-xs font-medium hover:bg-accent transition-colors">انتخاب همه</button>
        <button onclick={() => selectedIds = new Set()} disabled={selectedIds.size === 0} class="inline-flex items-center h-8 px-3 rounded-md border border-input bg-background text-xs font-medium hover:bg-accent transition-colors disabled:opacity-40">لغو انتخاب</button>
      </div>
      <div class="flex gap-2 flex-wrap mr-auto">
        <button onclick={exportSelected} disabled={selectedIds.size === 0 || exporting}
          class="inline-flex items-center h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
          {exporting ? 'در حال خروجی...' : '⬇ خروجی JSON'}
        </button>
        <label class="cursor-pointer">
          <input type="file" accept=".json" class="hidden" onchange={handleImport} disabled={importing} />
          <span class="inline-flex items-center h-8 px-3 rounded-md border border-input bg-background text-xs font-medium hover:bg-accent transition-colors {importing ? 'opacity-40 pointer-events-none' : ''}">
            {importing ? 'در حال وارد کردن...' : '⬆ ورودی JSON'}
          </span>
        </label>
        <button onclick={toggleSelectMode} class="inline-flex items-center h-8 px-3 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">انصراف</button>
      </div>
    </div>
  {/if}

  {#if loading}
    <div class="flex items-center justify-center py-16">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  {:else}
    <!-- Folders row -->
    {#if currentFolders().length > 0}
      <div class="mb-2">
        <p class="text-xs font-medium text-muted-foreground mb-2">پوشه‌ها</p>
        <div class="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {#each currentFolders() as folder (folder.id)}
            <FolderCard
              {folder}
              projectCount={folderProjectCounts[folder.id] || 0}
              onOpen={openFolder}
              onRename={openRenameFolder}
              onDelete={openDeleteFolder}
            />
          {/each}
        </div>
      </div>
    {/if}

    <!-- Projects grid -->
    {#if currentProjects().length > 0}
      {#if currentFolders().length > 0}
        <p class="text-xs font-medium text-muted-foreground mb-2 mt-4">پروژه‌ها</p>
      {/if}
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#each currentProjects() as project (project.id)}
          <ProjectCard
            {project}
            {selectMode}
            selected={selectedIds.has(project.id)}
            onSelect={toggleSelect}
            onDelete={openDeleteProject}
            onMove={openMoveDialog}
          />
        {/each}
      </div>
    {:else if currentFolders().length === 0}
      <!-- Empty state -->
      <div class="text-center py-16 border rounded-xl bg-muted/20">
        <div class="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          </svg>
        </div>
        <h2 class="text-lg font-semibold mb-1">
          {activeTypeFilter !== 'all' ? 'پروژه‌ای با این نوع یافت نشد' : 'هنوز پروژه‌ای ندارید'}
        </h2>
        <p class="text-sm text-muted-foreground mb-6">
          {activeTypeFilter !== 'all' ? 'فیلتر را تغییر دهید یا یک پروژه جدید بسازید' : 'اولین پروژه خود را ایجاد کنید'}
        </p>
        <div class="flex gap-3 justify-center flex-wrap">
          <a href="/projects/new{currentFolderId ? '?folderId=' + currentFolderId : ''}" class="inline-flex items-center gap-1.5 h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            پروژه جدید
          </a>
          <label class="cursor-pointer">
            <input type="file" accept=".json" class="hidden" onchange={handleImport} disabled={importing} />
            <span class="inline-flex items-center h-9 px-5 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors">
              وارد کردن از فایل
            </span>
          </label>
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- Delete Confirm Dialog -->
{#if showDeleteDialog}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => showDeleteDialog = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-card border rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl" onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center gap-3 mb-3">
        <div class="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </div>
        <div dir="rtl">
          <h3 class="text-base font-semibold">
            {deleteDialogType === 'folder' ? 'حذف پوشه' : 'حذف پروژه'}
          </h3>
          <p class="text-sm text-muted-foreground">«{deleteDialogName}»</p>
        </div>
      </div>
      <p class="text-sm text-muted-foreground mb-5 text-right" dir="rtl">
        {#if deleteDialogType === 'folder'}
          این پوشه حذف می‌شود. پروژه‌های داخل آن به ریشه منتقل می‌شوند.
        {:else}
          این پروژه و تمام فصل‌های آن برای همیشه حذف می‌شوند.
        {/if}
      </p>
      <div class="flex gap-2 justify-end" dir="rtl">
        <button onclick={() => showDeleteDialog = false}
          class="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors">
          انصراف
        </button>
        <button onclick={confirmDelete}
          class="h-9 px-4 rounded-md bg-destructive text-destructive-foreground text-sm hover:bg-destructive/90 transition-colors">
          حذف
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Folder Create/Rename Dialog -->
{#if showFolderDialog}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => showFolderDialog = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-card border rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-lg font-semibold mb-4" dir="rtl">
        {folderDialogMode === 'create' ? 'پوشه جدید' : 'تغییر نام پوشه'}
      </h3>
      <input
        type="text"
        bind:value={folderDialogName}
        placeholder="نام پوشه"
        dir="rtl"
        class="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-ring"
        onkeydown={(e) => e.key === 'Enter' && submitFolderDialog()}
      />
      <div class="flex gap-2 justify-end" dir="rtl">
        <button onclick={() => showFolderDialog = false} class="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors">
          انصراف
        </button>
        <button onclick={submitFolderDialog} disabled={!folderDialogName.trim()} class="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-40">
          {folderDialogMode === 'create' ? 'ایجاد' : 'ذخیره'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Move Project Dialog -->
{#if showMoveDialog}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => showMoveDialog = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-card border rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-lg font-semibold mb-4" dir="rtl">انتقال به پوشه</h3>
      <div class="flex flex-col gap-1 max-h-60 overflow-y-auto" dir="rtl">
        <button
          onclick={() => moveProjectToFolder(null)}
          class="text-right px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors flex items-center gap-2"
        >
          <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
          ریشه (بدون پوشه)
        </button>
        {#each allFolders as folder (folder.id)}
          <button
            onclick={() => moveProjectToFolder(folder.id)}
            class="text-right px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors flex items-center gap-2"
          >
            <svg class="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            </svg>
            {folder.name}
          </button>
        {/each}
      </div>
      <div class="mt-4 flex justify-end" dir="rtl">
        <button onclick={() => showMoveDialog = false} class="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors">
          انصراف
        </button>
      </div>
    </div>
  </div>
{/if}
