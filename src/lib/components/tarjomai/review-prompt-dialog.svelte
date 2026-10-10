<script>
  import {
    DEFAULT_CHAT_INSTRUCTIONS,
    DEFAULT_REVIEW_INSTRUCTIONS,
    PART_SIZES,
    resolvePromptConfig,
    estimateTokens,
    planReviewParts,
    buildChatSystemPrompt,
    buildReviewSystemPrompt,
    buildReviewUserMessage,
    partText
  } from '$lib/prompts/review.prompt.js';

  /**
   * View and edit the prompts used by the review panel. Only the
   * "instructions" part is free text; the context sections (rules, glossary,
   * chapter text) are toggles, and the review's output contract is fixed so
   * one-click fixes keep working. A live preview shows exactly what is sent.
   */

  /** @type {{
   *   open?: boolean,
   *   tab?: 'chat'|'review',
   *   config: any,
   *   ctx: import('$lib/prompts/review.prompt.js').ReviewContext,
   *   onSave: (cfg: any) => void | Promise<void>
   * }} */
  let { open = $bindable(false), tab = $bindable('chat'), config, ctx, onSave } = $props();

  /** @type {ReturnType<typeof resolvePromptConfig>} */
  let draft = $state(resolvePromptConfig(null));
  let showPreview = $state(false);
  let saving = $state(false);

  // Fresh copy of the saved config every time the dialog opens
  let wasOpen = false;
  $effect(() => {
    if (open && !wasOpen) {
      const c = resolvePromptConfig(config);
      draft = {
        ...c,
        chatInstructions: c.chatInstructions || DEFAULT_CHAT_INSTRUCTIONS[ctx.operationType],
        reviewInstructions: c.reviewInstructions || DEFAULT_REVIEW_INSTRUCTIONS[ctx.operationType]
      };
      showPreview = false;
    }
    wasOpen = open;
  });

  const defaultInstr = $derived(tab === 'chat' ? DEFAULT_CHAT_INSTRUCTIONS[ctx.operationType] : DEFAULT_REVIEW_INSTRUCTIONS[ctx.operationType]);
  const isDefault = $derived((tab === 'chat' ? draft.chatInstructions : draft.reviewInstructions).trim() === defaultInstr.trim());

  const preview = $derived.by(() => {
    if (!showPreview) return null;
    if (tab === 'chat') {
      const system = buildChatSystemPrompt(ctx, draft);
      return { system, user: '', parts: 0, tokens: estimateTokens(system) };
    }
    const size = PART_SIZES.find(p => p.key === draft.partSize) || PART_SIZES[1];
    const plan = planReviewParts(ctx.units, size.chars);
    if (!plan.length) return { system: buildReviewSystemPrompt(ctx, draft, ''), user: '(متنی برای بررسی نیست)', parts: 0, tokens: 0 };
    const system = buildReviewSystemPrompt(ctx, draft, partText(ctx, plan[0]));
    const user = buildReviewUserMessage(ctx, plan[0], plan.length);
    return { system, user, parts: plan.length, tokens: estimateTokens(system) + estimateTokens(user) };
  });

  const fa = (/** @type {number} */ n) => n.toLocaleString('fa-IR');

  function resetInstructions() {
    if (tab === 'chat') draft.chatInstructions = DEFAULT_CHAT_INSTRUCTIONS[ctx.operationType];
    else draft.reviewInstructions = DEFAULT_REVIEW_INSTRUCTIONS[ctx.operationType];
  }

  async function save() {
    saving = true;
    try {
      // Store '' for untouched defaults so future default improvements apply.
      await onSave({
        ...draft,
        chatInstructions: draft.chatInstructions.trim() === DEFAULT_CHAT_INSTRUCTIONS[ctx.operationType].trim() ? '' : draft.chatInstructions,
        reviewInstructions: draft.reviewInstructions.trim() === DEFAULT_REVIEW_INSTRUCTIONS[ctx.operationType].trim() ? '' : draft.reviewInstructions
      });
      open = false;
    } finally {
      saving = false;
    }
  }

  /** @param {KeyboardEvent} e */
  function onKeydown(e) {
    if (open && e.key === 'Escape') open = false;
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={() => open = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="bg-card border rounded-xl shadow-xl w-full max-w-2xl max-h-[88vh] flex flex-col"
      dir="rtl"
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-label="پرامپت‌های بررسی و گفتگو"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="px-5 pt-4 pb-3 border-b space-y-3 shrink-0">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h3 class="text-base font-semibold">پرامپت‌ها</h3>
            <p class="text-xs text-muted-foreground mt-0.5">آنچه برای مدل فرستاده می‌شود؛ برای همین پروژه ذخیره می‌شود.</p>
          </div>
          <button onclick={() => open = false} class="text-muted-foreground hover:text-foreground transition-colors" aria-label="بستن">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div class="inline-flex p-0.5 rounded-lg bg-muted" role="tablist">
          <button role="tab" aria-selected={tab === 'chat'} onclick={() => tab = 'chat'}
            class="text-xs px-3 h-7 rounded-md transition-colors {tab === 'chat' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}">گفتگو</button>
          <button role="tab" aria-selected={tab === 'review'} onclick={() => tab = 'review'}
            class="text-xs px-3 h-7 rounded-md transition-colors {tab === 'review' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}">بررسی کلی</button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <!-- Instructions -->
        <section class="space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <label for="prompt-instructions" class="text-sm font-medium">دستورالعمل</label>
            {#if !isDefault}
              <button onclick={resetInstructions} class="text-[11px] text-muted-foreground hover:text-foreground">بازگشت به پیش‌فرض</button>
            {/if}
          </div>
          {#if tab === 'chat'}
            <textarea id="prompt-instructions" bind:value={draft.chatInstructions} rows={6} dir="rtl"
              class="w-full text-xs leading-relaxed p-2.5 rounded-md border border-input bg-background resize-y focus:outline-none focus:ring-1 focus:ring-ring"></textarea>
          {:else}
            <textarea id="prompt-instructions" bind:value={draft.reviewInstructions} rows={8} dir="rtl"
              class="w-full text-xs leading-relaxed p-2.5 rounded-md border border-input bg-background resize-y focus:outline-none focus:ring-1 focus:ring-ring"></textarea>
            <p class="text-[11px] text-muted-foreground leading-relaxed">
              قالب خروجی (JSON)، دسته‌بندی‌ها و قواعد «متن فعلی ← پیشنهاد» ثابت‌اند و خودکار اضافه می‌شوند تا اصلاح یک‌کلیکی همیشه کار کند. در پیش‌نمایش پایین می‌توانید آن‌ها را ببینید.
            </p>
          {/if}
        </section>

        <!-- Automatic context -->
        <section class="space-y-2">
          <h4 class="text-sm font-medium">زمینه‌ای که خودکار اضافه می‌شود</h4>
          <label class="flex items-start gap-2 text-xs cursor-pointer">
            <input type="checkbox" bind:checked={draft.includeRules} class="mt-0.5 accent-primary" />
            <span>
              قوانین و سبک پروژه
              <span class="text-muted-foreground">— {(ctx.rules || '').trim() ? `${fa((ctx.rules || '').trim().split('\n').filter(Boolean).length)} خط` : 'برای این پروژه قانونی تعریف نشده'}</span>
            </span>
          </label>
          <label class="flex items-start gap-2 text-xs cursor-pointer">
            <input type="checkbox" bind:checked={draft.includeGlossary} class="mt-0.5 accent-primary" />
            <span>واژه‌نامه <span class="text-muted-foreground">— فقط واژه‌هایی که در همان متن آمده‌اند</span></span>
          </label>

          {#if tab === 'chat'}
            <div class="space-y-1 pt-1">
              <span class="text-xs">متن فصل</span>
              <div class="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-muted max-w-sm">
                <button onclick={() => draft.chatContext = 'full'}
                  class="text-[11px] py-1.5 rounded-md transition-colors {draft.chatContext === 'full' ? 'bg-background shadow-xs' : 'text-muted-foreground'}">کل فصل، بند به بند</button>
                <button onclick={() => draft.chatContext = 'none'}
                  class="text-[11px] py-1.5 rounded-md transition-colors {draft.chatContext === 'none' ? 'bg-background shadow-xs' : 'text-muted-foreground'}">بدون متن فصل</button>
              </div>
              <p class="text-[11px] text-muted-foreground leading-relaxed">
                با «کل فصل» مدل همه‌ی بندها را با شماره می‌بیند و می‌توانید بپرسید «بند ۱۲ را بررسی کن». متن در ابتدای پرامپت ثابت است و در مدل‌هایی که کش دارند، هزینه‌ی پیام‌های بعدی کمتر می‌شود.
              </p>
            </div>
          {:else}
            <div class="space-y-1 pt-1">
              <span class="text-xs">اندازه‌ی هر بخش</span>
              <div class="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-muted max-w-sm">
                {#each PART_SIZES as s (s.key)}
                  <button onclick={() => draft.partSize = s.key} title={s.hint}
                    class="text-[11px] py-1.5 rounded-md transition-colors {draft.partSize === s.key ? 'bg-background shadow-xs' : 'text-muted-foreground'}">{s.label} <span class="opacity-60">({fa(s.chars)})</span></button>
                {/each}
              </div>
            </div>
          {/if}
        </section>

        <!-- Live preview -->
        <section class="space-y-2">
          <button onclick={() => showPreview = !showPreview} class="text-sm font-medium inline-flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 transition-transform {showPreview ? '' : 'rotate-90'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
            پیش‌نمایش پرامپت نهایی
          </button>
          {#if preview}
            <p class="text-[11px] text-muted-foreground">
              {#if tab === 'chat'}
                پیام سیستمی هر پرسش (به‌علاوه‌ی تاریخچه‌ی گفتگو) · حدود {fa(preview.tokens)} توکن
              {:else}
                {preview.parts > 1 ? `بخش ۱ از ${fa(preview.parts)}` : 'یک بخش'} · حدود {fa(preview.tokens)} توکن ورودی
              {/if}
            </p>
            <div class="space-y-1">
              <span class="text-[11px] font-medium text-muted-foreground">system</span>
              <pre class="text-[11px] leading-relaxed whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-2.5 max-h-72 overflow-y-auto font-[inherit]" dir="auto">{preview.system}</pre>
            </div>
            {#if preview.user}
              <div class="space-y-1">
                <span class="text-[11px] font-medium text-muted-foreground">user</span>
                <pre class="text-[11px] leading-relaxed whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-2.5 max-h-56 overflow-y-auto font-[inherit]" dir="auto">{preview.user}</pre>
              </div>
            {/if}
          {/if}
        </section>
      </div>

      <div class="px-5 py-3 border-t flex items-center justify-end gap-2 shrink-0">
        <button onclick={() => open = false} class="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors">انصراف</button>
        <button onclick={save} disabled={saving} class="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">ذخیره</button>
      </div>
    </div>
  </div>
{/if}
