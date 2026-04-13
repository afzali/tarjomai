<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import projectsService from '$lib/services/projects.service.js';
  import operationConfigService from '$lib/services/operationConfig.service.js';
  import { settingsStore } from '$lib/stores/settings.store.js';
  import WizardShell from '$lib/components/tarjomai/wizard-shell.svelte';
  import { getEditorialWizardSteps } from '$lib/operations/wizards/editorial.wizard.js';
  import * as Select from '$lib/components/ui-rtl/select';
  import { Label } from '$lib/components/ui-rtl/label';
  import { Textarea } from '$lib/components/ui-rtl/textarea';

  const steps = getEditorialWizardSteps();

  let projectId = $derived(parseInt($page.params.id));
  let project = $state(null);

  // Step state
  let currentStepIndex = $state(0);
  let saving = $state(false);

  // Language comes from project.sourceLanguage (set during new project creation)
  let textLanguage = $state('fa');

  // Step 0: Options
  let options = $state({
    normalizeUnicode: true,
    replaceHalfSpaces: false,
    addHalfSpaces: true,
    fixSpelling: true,
    grammarCorrection: true,
    customInstructions: ''
  });

  // Step 2: Prompt review
  let promptMode = $state('auto'); // 'auto' | 'manual'
  let generatedPrompt = $state('');
  let customPrompt = $state('');

  const defaultLanguageItems = [
    { value: 'fa', label: 'فارسی' },
    { value: 'en', label: 'انگلیسی' },
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
  const textLanguageLabel = $derived(languageItems.find(l => l.value === textLanguage)?.label ?? 'انتخاب زبان');

  onMount(async () => {
    project = await projectsService.getProject(projectId);
    if (!project) {
      goto('/');
      return;
    }
    // Language from project (set during new project creation — not asked again here)
    textLanguage = project.sourceLanguage || 'fa';

    const settings = await settingsStore.load();
    if (settings?.customLanguages?.length) customLanguageItems = settings.customLanguages;

    // Load existing config if any
    const existing = await operationConfigService.getConfig(projectId);
    if (existing?.options) {
      options = { ...options, ...existing.options };
    }
    if (existing?.systemPrompt) customPrompt = existing.systemPrompt;
    if (existing?.promptMode) promptMode = existing.promptMode;
  });

  function rebuildPrompt() {
    generatedPrompt = operationConfigService.buildEditorialPrompt(options, textLanguage);
  }

  async function handleNext() {
    if (currentStepIndex === 0) {
      // Build prompt before showing step 1
      rebuildPrompt();
      currentStepIndex = 1;
    }
  }

  async function handleFinish() {
    saving = true;
    try {
      const finalPrompt = promptMode === 'auto' ? generatedPrompt : customPrompt;
      await operationConfigService.saveConfig(projectId, {
        operationType: 'editorial',
        options: { ...options },
        systemPrompt: finalPrompt,
        promptMode
      });
      await projectsService.updateSetupStep(projectId, 'completed');
      await projectsService.updateProject(projectId, { sourceLanguage: textLanguage });
      goto(`/projects/${projectId}/editorial`);
    } finally {
      saving = false;
    }
  }

  function handleBack() {
    if (currentStepIndex === 0) {
      goto(`/projects/${projectId}`);
    } else {
      currentStepIndex -= 1;
    }
  }
</script>

<WizardShell
  {steps}
  {currentStepIndex}
  projectTitle={project?.title}
  operationType="editorial"
  {saving}
  canProceed={true}
  backUrl="/"
  finishLabel="شروع ویراستاری"
  onNext={handleNext}
  onBack={handleBack}
  onFinish={handleFinish}
>
  {#if currentStepIndex === 0}
    <!-- Step 0: Editorial Options -->
    <div class="space-y-4" dir="rtl">
      <div class="space-y-3">
        {#each [
          { key: 'normalizeUnicode', label: 'نرمال‌سازی یونیکد', desc: 'تبدیل «ی» و «ک» عربی به فارسی و یکسان‌سازی کاراکترها' },
          { key: 'addHalfSpaces', label: 'اصلاح نیم‌فاصله‌های کم', desc: 'نیم‌فاصله‌های لازم بین پیشوند/پسوند و کلمه اضافه می‌شود (مثلاً می‌رود، می‌شود)' },
          { key: 'replaceHalfSpaces', label: 'جایگزینی نیم‌فاصله‌های اشتباه با فاصله', desc: 'نیم‌فاصله‌هایی که نباید باشند با فاصله معمولی جایگزین می‌شوند' },
          { key: 'fixSpelling', label: 'تصحیح غلط‌های املایی', desc: 'اشتباهات نگارشی و تایپی اصلاح می‌شوند' },
          { key: 'grammarCorrection', label: 'پیشنهاد تصحیح دستوری', desc: 'بهبود ساختار جمله‌بندی و دستور زبان' }
        ] as opt}
          <label class="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors {/** @type {any} */(options)[opt.key] ? 'border-primary/40 bg-primary/5' : ''}">
            <input
              type="checkbox"
              bind:checked={(/** @type {any} */(options))[opt.key]}
              class="mt-0.5 accent-primary"
            />
            <div>
              <div class="text-sm font-medium">{opt.label}</div>
              <div class="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
            </div>
          </label>
        {/each}
      </div>

      <div class="space-y-2">
        <Label for="custom-instructions">دستورات سفارشی (اختیاری)</Label>
        <Textarea
          id="custom-instructions"
          bind:value={options.customInstructions}
          placeholder="مثال: از فعل‌های مجهول اجتناب کنید..."
          rows={3}
          dir="rtl"
        />
      </div>
    </div>

  {:else if currentStepIndex === 1}
    <!-- Step 1: Prompt Review -->
    <div class="space-y-4" dir="rtl">
      <!-- Mode toggle -->
      <div class="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
        <button
          onclick={() => promptMode = 'auto'}
          class="px-4 py-1.5 rounded-md text-sm font-medium transition-all
                 {promptMode === 'auto' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}"
        >
          خودکار
        </button>
        <button
          onclick={() => promptMode = 'manual'}
          class="px-4 py-1.5 rounded-md text-sm font-medium transition-all
                 {promptMode === 'manual' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}"
        >
          دستی
        </button>
      </div>

      {#if promptMode === 'auto'}
        <div class="space-y-2">
          <Label>دستورالعمل تولیدشده (قابل مشاهده)</Label>
          <div class="p-3 rounded-lg border bg-muted/30 text-sm whitespace-pre-wrap font-mono leading-relaxed text-muted-foreground" dir="rtl">
            {generatedPrompt || 'بر اساس گزینه‌های انتخاب شده...'}
          </div>
          <p class="text-xs text-muted-foreground">
            این دستورالعمل بر اساس گزینه‌های ویرایش خودکار ساخته شده است.
          </p>
        </div>
      {:else}
        <div class="space-y-2">
          <Label for="custom-prompt">دستورالعمل دستی</Label>
          <Textarea
            id="custom-prompt"
            bind:value={customPrompt}
            placeholder="دستورالعمل کامل برای هوش مصنوعی را اینجا بنویسید..."
            rows={8}
            dir="rtl"
            class="font-mono text-sm"
          />
        </div>
        <button
          onclick={() => { rebuildPrompt(); customPrompt = generatedPrompt; }}
          class="text-xs text-primary hover:underline"
        >
          ← وارد کردن دستورالعمل خودکار به عنوان پایه
        </button>
      {/if}
    </div>
  {/if}
</WizardShell>
