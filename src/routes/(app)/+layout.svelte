<script>
	import { uiStore } from '$lib/stores/ui.store.js';
	import OnboardingModal from '$lib/components/tarjomai/onboarding-modal.svelte';
	
	let { children } = $props();
	let showOnboarding = $state(false);

	$effect(() => {
		const unsub = uiStore.subscribe(value => {
			showOnboarding = value.showOnboarding;
		});
		return unsub;
	});
</script>

{@render children?.()}

{#if showOnboarding}
	<OnboardingModal />
{/if}
