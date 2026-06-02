<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { currentProjectStore } from '$lib/stores/currentProject.store.js';
  import projectsService from '$lib/services/projects.service.js';
  import GlossaryManager from '$lib/components/tarjomai/glossary-manager.svelte';

  let projectId = $derived(parseInt($page.params.id || '0', 10) || 0);
  /** @type {any} */
  let project = $state(null);
  /** @type {any} */
  let config = $state(null);
  let loading = $state(true);
  let saving = $state(false);
  let savedAt = $state('');

  /** @type {{source:string,target:string,note:string}[]} */
  let entries = $state([]);
  let glossaryPrompt = $state('');
  let glossaryModel = $state('');

  // Where did we come from? Wizard flow vs. direct edit.
  let fromWizard = $derived($page.url.searchParams.get('wizard') === '1');

  onMount(async () => {
    const data = await currentProjectStore.load(projectId);
    if (!data) { goto('/'); return; }
    project = data.project;
    config = data.config;

    if (Array.isArray(config?.glossary)) entries = config.glossary.map((/** @type {any} */ e) => ({ ...e }));
    if (config?.glossaryPrompt) glossaryPrompt = config.glossaryPrompt;
    if (config?.glossaryModel) glossaryModel = config.glossaryModel;
    loading = false;
  });

  function onGlossaryChange(/** @type {{entries:any[],prompt:string,model:string}} */ data) {
    entries = data.entries;
    glossaryPrompt = data.prompt;
    glossaryModel = data.model;
  }

  async function save() {
    saving = true;
    await currentProjectStore.saveConfig({
      ...config,
      glossary: entries.map(e => ({ ...e })),
      glossaryPrompt,
      glossaryModel
    });
    // reflect latest config locally
    const fresh = await currentProjectStore.load(projectId);
    if (fresh) config = fresh.config;
    saving = false;
    savedAt = new Date().toLocaleTimeString('fa-IR');
  }

  async function saveAndContinue() {
    await save();
    // Glossary is optional and sits before the workspace; mark setup as far along.
    goto(`/projects/${projectId}`);
  }
</script>

<div class="min-h-screen bg-background" dir="rtl">
  <div class="border-b bg-card px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
    <button onclick={() => goto(`/projects/${projectId}`)}
      class="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" aria-label="بازگشت">
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
    </button>
    <div class="flex-1 min-w-0">
      <p class="text-xs text-muted-foreground truncate">{project?.title || '...'}</p>
      <p class="text-sm font-medium">واژه‌نامه <span class="text-xs font-normal text-muted-foreground">(اختیاری)</span></p>
    </div>
    {#if savedAt}<span class="text-[11px] text-green-600 dark:text-green-400">ذخیره شد ({savedAt})</span>{/if}
    {#if fromWizard}
      <button onclick={() => goto(`/projects/${projectId}`)} disabled={saving}
        class="h-8 px-3 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40">
        رد کردن
      </button>
    {/if}
    <button onclick={save} disabled={saving}
      class="h-8 px-3 rounded-md text-sm border border-input bg-background hover:bg-muted transition-colors disabled:opacity-40">
      {saving ? 'در حال ذخیره...' : 'ذخیره'}
    </button>
    <button onclick={saveAndContinue} disabled={saving}
      class="h-8 px-4 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40">
      {fromWizard ? 'ذخیره و شروع کار' : 'ذخیره و ادامه'}
    </button>
  </div>

  <div class="max-w-3xl mx-auto px-4 py-6">
    {#if loading}
      <div class="flex items-center justify-center py-16">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    {:else}
      <p class="text-sm text-muted-foreground mb-5 leading-relaxed">
        واژه‌نامه فهرستی از اصطلاحات کلیدی متن و معادل دقیق آن‌هاست. بعد از ساختن، این فهرست در هر درخواست ترجمه برای مدل ارسال می‌شود تا معادل‌ها در کل متن یکدست و هماهنگ بمانند. این مرحله کاملاً اختیاری است.
      </p>
      <GlossaryManager
        bind:entries
        bind:prompt={glossaryPrompt}
        bind:model={glossaryModel}
        sourceLanguage={project?.sourceLanguage || 'en'}
        targetLanguage={project?.targetLanguage || 'fa'}
        onChange={onGlossaryChange}
      />
    {/if}
  </div>
</div>
