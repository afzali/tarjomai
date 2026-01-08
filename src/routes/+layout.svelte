<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import RtlProvider from '$lib/components/rtl-provider.svelte';
	import { settingsStore } from '$lib/stores/settings.store.js';
	import { uiStore } from '$lib/stores/ui.store.js';
	import { Toaster } from '$lib/components/ui-rtl/sonner';
	
	let { children } = $props();
	let initialized = $state(false);
	let settings = $state(null);

	onMount(async () => {
		settings = await settingsStore.load();
		const hasKey = await settingsStore.hasApiKey();
		if (!hasKey) {
			uiStore.setOnboarding(true);
		}
		initialized = true;
	});

	$effect(() => {
		const unsub = settingsStore.subscribe(value => {
			settings = value;
		});
		return unsub;
	});
</script>

<svelte:head>
	<title>ترجمای - ابزار ترجمه هوشمند</title>
	<meta name="description" content="ابزار ترجمه و مقایسه هوشمند متون با هوش مصنوعی" />
</svelte:head>

<RtlProvider rtl={settings?.uiLanguage === 'fa'} lang={settings?.uiLanguage || 'fa'}>
	{#if initialized}
		{@render children?.()}
	{:else}
		<div class="flex items-center justify-center min-h-screen">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
		</div>
	{/if}
	<Toaster position="top-center" dir="rtl" />
</RtlProvider>
