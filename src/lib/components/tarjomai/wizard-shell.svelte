<script>
  import { goto } from '$app/navigation';
  import FileTypeIcon from './file-type-icon.svelte';

  /**
   * @typedef {{ id: string, label: string, icon?: string, description?: string, canSkip?: boolean }} WizardStep
   */

  /**
   * @type {{
   *   steps: WizardStep[],
   *   currentStepIndex: number,
   *   projectTitle?: string,
   *   operationType?: string,
   *   saving?: boolean,
   *   canProceed?: boolean,
   *   backUrl?: string,
   *   nextLabel?: string,
   *   finishLabel?: string,
   *   onNext?: () => Promise<void> | void,
   *   onBack?: () => void,
   *   onFinish?: () => Promise<void> | void,
   *   children?: import('svelte').Snippet,
   * }}
   */
  let {
    steps = [],
    currentStepIndex = 0,
    projectTitle = '',
    operationType = 'translation',
    saving = false,
    canProceed = true,
    backUrl = '/',
    nextLabel = 'ادامه',
    finishLabel = 'شروع کار',
    onNext,
    onBack,
    onFinish,
    children
  } = $props();

  const isLastStep = $derived(currentStepIndex >= steps.length - 1);
  const currentStep = $derived(steps[currentStepIndex]);

  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      goto(backUrl);
    }
  }

  async function handleNext() {
    if (isLastStep) {
      await onFinish?.();
    } else {
      await onNext?.();
    }
  }
</script>

<div class="flex flex-col min-h-screen bg-background" dir="rtl">
  <!-- Header -->
  <div class="border-b bg-card px-4 py-3 flex items-center gap-3">
    <button
      onclick={handleBack}
      class="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      aria-label="برگشت"
    >
      <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>

    <FileTypeIcon {operationType} size="sm" showExtension={false} />

    <div class="flex-1 min-w-0">
      {#if projectTitle}
        <p class="text-xs text-muted-foreground truncate">{projectTitle}</p>
      {/if}
      {#if currentStep}
        <p class="text-sm font-medium truncate">{currentStep.label}</p>
      {/if}
    </div>
  </div>

  <!-- Step Bar -->
  {#if steps.length > 1}
    <div class="border-b bg-muted/30 px-4 py-3">
      <div class="flex items-center gap-0 max-w-2xl mx-auto">
        {#each steps as step, i}
          {@const isDone = i < currentStepIndex}
          {@const isActive = i === currentStepIndex}
          {@const isUpcoming = i > currentStepIndex}

          <!-- Step Dot -->
          <div class="flex flex-col items-center gap-1 flex-shrink-0">
            <div class="
              flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all
              {isDone ? 'bg-primary text-primary-foreground' : ''}
              {isActive ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1' : ''}
              {isUpcoming ? 'bg-muted border-2 border-muted-foreground/30 text-muted-foreground' : ''}
            ">
              {#if isDone}
                <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              {:else}
                {i + 1}
              {/if}
            </div>
            <span class="
              text-[10px] font-medium whitespace-nowrap
              {isActive ? 'text-primary' : ''}
              {isDone ? 'text-primary/70' : ''}
              {isUpcoming ? 'text-muted-foreground' : ''}
            ">{step.label}</span>
          </div>

          <!-- Connector line between steps -->
          {#if i < steps.length - 1}
            <div class="
              flex-1 h-0.5 mx-1 mb-4 transition-all
              {i < currentStepIndex ? 'bg-primary' : 'bg-muted-foreground/20'}
            "></div>
          {/if}
        {/each}
      </div>
    </div>
  {/if}

  <!-- Step Content -->
  <div class="flex-1 overflow-y-auto">
    <div class="max-w-2xl mx-auto px-4 py-6">
      {#if currentStep?.description}
        <p class="text-sm text-muted-foreground mb-6">{currentStep.description}</p>
      {/if}
      {@render children?.()}
    </div>
  </div>

  <!-- Footer Navigation -->
  <div class="border-t bg-card px-4 py-3 flex items-center justify-between gap-3">
    <button
      onclick={handleBack}
      class="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium
             text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m9 18 6-6-6-6" />
      </svg>
      قبلی
    </button>

    <button
      onclick={handleNext}
      disabled={saving || !canProceed}
      class="inline-flex items-center gap-1.5 px-5 py-2 rounded-md text-sm font-medium
             bg-primary text-primary-foreground hover:bg-primary/90 transition-colors
             disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {#if saving}
        <svg class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        در حال ذخیره...
      {:else}
        {isLastStep ? finishLabel : nextLabel}
        {#if !isLastStep}
          <svg class="w-4 h-4 rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        {/if}
      {/if}
    </button>
  </div>
</div>
