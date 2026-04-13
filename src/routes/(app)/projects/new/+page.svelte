<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { projectsStore } from '$lib/stores/projects.store.js';
  import { settingsStore } from '$lib/stores/settings.store.js';
  import { getAllOperations, getOperation } from '$lib/operations/index.js';
  import { getFileType } from '$lib/operations/fileTypes.js';
  import FileTypeIcon from '$lib/components/tarjomai/file-type-icon.svelte';
  import { Button } from '$lib/components/ui-rtl/button';
  import { Input } from '$lib/components/ui-rtl/input';
  import { Label } from '$lib/components/ui-rtl/label';
  import { Textarea } from '$lib/components/ui-rtl/textarea';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui-rtl/card';
  import * as Select from '$lib/components/ui-rtl/select';

  // Step 0: operation type selection
  // Step 1: project details + setup options
  let step = $state(0);
  let operationType = $state('');  // chosen in step 0

  const folderId = $derived(() => {
    const v = $page.url.searchParams.get('folderId');
    return v ? parseInt(v, 10) : null;
  });

  let title = $state('');
  let description = $state('');
  let sourceLanguage = $state('en');
  let targetLanguage = $state('fa');
  let setupType = $state('guided');  // for translation only
  let creating = $state(false);

  const allOperations = getAllOperations();

  const defaultLanguageItems = [
    { value: 'en', label: 'انگلیسی' },
    { value: 'fa', label: 'فارسی' },
    { value: 'ar', label: 'عربی' },
    { value: 'de', label: 'آلمانی' },
    { value: 'fr', label: 'فرانسوی' },
    { value: 'es', label: 'اسپانیایی' },
    { value: 'it', label: 'ایتالیایی' },
    { value: 'ru', label: 'روسی' },
    { value: 'zh', label: 'چینی' },
    { value: 'ja', label: 'ژاپنی' },
    { value: 'tr', label: 'ترکی' }
  ];

  let customLanguageItems = $state([]);
  const languageItems = $derived([...defaultLanguageItems, ...customLanguageItems]);

  const sourceLabel = $derived(languageItems.find(l => l.value === sourceLanguage)?.label ?? 'انتخاب زبان');
  const targetLabel = $derived(languageItems.find(l => l.value === targetLanguage)?.label ?? 'انتخاب زبان');

  const selectedFileType = $derived(operationType ? getFileType(operationType) : null);

  onMount(async () => {
    const settings = await settingsStore.load();
    if (settings?.defaultSourceLanguage) sourceLanguage = settings.defaultSourceLanguage;
    if (settings?.defaultTargetLanguage) targetLanguage = settings.defaultTargetLanguage;
    if (settings?.customLanguages?.length) customLanguageItems = settings.customLanguages;
  });

  function selectOperationType(type) {
    operationType = type;
    step = 1;
  }

  async function createProject() {
    if (!title.trim()) return;

    creating = true;
    try {
      const projectData = {
        title: title.trim(),
        description: description.trim(),
        operationType,
        sourceLanguage,
        targetLanguage: operationType === 'editorial' ? sourceLanguage : targetLanguage,
        folderId: folderId() ?? null
      };

      const project = await projectsStore.create(projectData);
      const operation = getOperation(operationType);

      if (operationType === 'translation') {
        goto(operation.wizardEntryUrl(project.id, setupType));
      } else {
        goto(operation.wizardEntryUrl(project.id));
      }
    } finally {
      creating = false;
    }
  }
</script>

<div class="container mx-auto py-8 px-4 max-w-2xl" dir="rtl">
  <div class="mb-6 flex items-center gap-3">
    <a href="/" class="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </a>
    <div>
      <h1 class="text-2xl font-bold">پروژه جدید</h1>
      <p class="text-sm text-muted-foreground mt-0.5">
        {step === 0 ? 'نوع عملیات را انتخاب کنید' : 'اطلاعات پروژه را وارد کنید'}
      </p>
    </div>
  </div>

  {#if step === 0}
    <!-- Step 0: Operation Type Selection -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {#each allOperations as op}
        {@const ft = getFileType(op.id)}
        <button
          onclick={() => selectOperationType(op.id)}
          class="group flex flex-col items-start gap-4 p-5 rounded-xl border-2 text-right transition-all
                 hover:border-primary/50 hover:shadow-md hover:bg-muted/30
                 {operationType === op.id ? 'border-primary bg-primary/5' : 'border-border'}"
        >
          <div class="flex items-center gap-3 w-full">
            <FileTypeIcon operationType={op.id} size="md" />
            <div class="flex-1 min-w-0">
              <div class="font-semibold">{op.label}</div>
              <div class="text-xs font-mono text-muted-foreground">{ft.extension}</div>
            </div>
            <svg class="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
          <p class="text-sm text-muted-foreground leading-relaxed">{op.description}</p>
        </button>
      {/each}
    </div>

  {:else}
    <!-- Step 1: Project details -->
    <div class="flex items-center gap-2 mb-6">
      <button onclick={() => step = 0} class="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← تغییر نوع
      </button>
      {#if selectedFileType}
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium {selectedFileType.badgeClass}">
          <span class="font-mono">{selectedFileType.extension}</span>
          {selectedFileType.label}
        </span>
      {/if}
    </div>

    <Card>
      <CardHeader>
        <CardTitle>اطلاعات پروژه</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <Label for="title">عنوان پروژه *</Label>
          <Input
            id="title"
            bind:value={title}
            placeholder={operationType === 'editorial' ? 'مثال: ویرایش مقاله...' : 'مثال: ترجمه کتاب...'}
          />
        </div>

        <div class="space-y-2">
          <Label for="description">توضیحات (اختیاری)</Label>
          <Textarea
            id="description"
            bind:value={description}
            placeholder="توضیحات کوتاه درباره پروژه..."
            rows={2}
          />
        </div>

        {#if operationType === 'translation'}
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>زبان مبدأ</Label>
              <Select.Root type="single" bind:value={sourceLanguage}>
                <Select.Trigger class="w-full">{sourceLabel}</Select.Trigger>
                <Select.Content>
                  {#each languageItems as item (item.value)}
                    <Select.Item value={item.value} label={item.label}>{item.label}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>
            <div class="space-y-2">
              <Label>زبان مقصد</Label>
              <Select.Root type="single" bind:value={targetLanguage}>
                <Select.Trigger class="w-full">{targetLabel}</Select.Trigger>
                <Select.Content>
                  {#each languageItems as item (item.value)}
                    <Select.Item value={item.value} label={item.label}>{item.label}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>
          </div>
        {:else if operationType === 'editorial'}
          <div class="space-y-2">
            <Label>زبان متن</Label>
            <Select.Root type="single" bind:value={sourceLanguage}>
              <Select.Trigger class="w-full">{sourceLabel}</Select.Trigger>
              <Select.Content>
                {#each languageItems as item (item.value)}
                  <Select.Item value={item.value} label={item.label}>{item.label}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>
        {/if}
      </CardContent>
    </Card>

    {#if operationType === 'translation'}
      <Card class="mt-4">
        <CardHeader>
          <CardTitle>نوع راه‌اندازی</CardTitle>
          <CardDescription>چگونه می‌خواهید پروژه را شروع کنید؟</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <label class="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors {setupType === 'guided' ? 'border-primary bg-primary/5' : ''}">
            <input type="radio" bind:group={setupType} value="guided" class="mt-1" />
            <div>
              <div class="font-medium">شروع هدایت‌شده <span class="text-xs text-muted-foreground">(توصیه می‌شود)</span></div>
              <div class="text-sm text-muted-foreground">
                تحلیل سبک نگارش، مقایسه مدل‌ها و انتخاب بهترین
              </div>
            </div>
          </label>

          <label class="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors {setupType === 'quick' ? 'border-primary bg-primary/5' : ''}">
            <input type="radio" bind:group={setupType} value="quick" class="mt-1" />
            <div>
              <div class="font-medium">شروع سریع</div>
              <div class="text-sm text-muted-foreground">
                مستقیماً مدل و قوانین ترجمه را انتخاب کنید
              </div>
            </div>
          </label>
        </CardContent>
      </Card>
    {/if}

    <div class="mt-6 flex gap-2">
      <Button variant="outline" onclick={() => step = 0}>قبلی</Button>
      <Button onclick={createProject} disabled={creating || !title.trim()}>
        {creating ? 'در حال ایجاد...' : 'ایجاد پروژه'}
      </Button>
    </div>
  {/if}
</div>
