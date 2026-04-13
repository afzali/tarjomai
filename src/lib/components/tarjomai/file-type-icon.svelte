<script>
  import { getFileType } from '$lib/operations/fileTypes.js';

  /**
   * @type {{ operationType: string, size?: 'sm' | 'md' | 'lg', showExtension?: boolean }}
   */
  let { operationType = 'translation', size = 'md', showExtension = true } = $props();

  const fileType = $derived(getFileType(operationType));

  const sizeClasses = {
    sm: { wrapper: 'w-8 h-8 rounded-lg', icon: 'w-4 h-4', ext: 'text-[8px]' },
    md: { wrapper: 'w-12 h-12 rounded-xl', icon: 'w-6 h-6', ext: 'text-[10px]' },
    lg: { wrapper: 'w-16 h-16 rounded-2xl', icon: 'w-8 h-8', ext: 'text-xs' }
  };

  const sizes = $derived(sizeClasses[size] || sizeClasses.md);
</script>

<div
  class="flex flex-col items-center justify-center border {fileType.bgClass} {fileType.borderClass} {sizes.wrapper} shrink-0"
  title={fileType.label}
>
  <svg
    class="{sizes.icon} {fileType.textClass}"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    {#if fileType.icon === 'languages'}
      <!-- Languages icon -->
      <path d="m5 8 6 6" />
      <path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" />
      <path d="M14 18h6" />
    {:else if fileType.icon === 'pencil-line'}
      <!-- Pencil-line icon -->
      <path d="M12 20h9" />
      <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
      <path d="m15 5 3 3" />
    {:else if fileType.icon === 'book-open'}
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    {:else if fileType.icon === 'file-minus'}
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M9 15h6" />
    {:else}
      <!-- Generic file icon fallback -->
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    {/if}
  </svg>
  {#if showExtension}
    <span class="font-mono font-bold {sizes.ext} {fileType.textClass} mt-0.5 leading-none">
      {fileType.extension}
    </span>
  {/if}
</div>
