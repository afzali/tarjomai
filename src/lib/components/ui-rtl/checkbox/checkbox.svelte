<script>
	import BaseCheckbox from '$lib/components/ui/checkbox/checkbox.svelte';
	
	let { checked = $bindable(), ...restProps } = $props();
</script>

<BaseCheckbox bind:checked {...restProps} />
