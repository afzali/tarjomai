<script>
	import BaseTextarea from '$lib/components/ui/textarea/textarea.svelte';
	
	let { value = $bindable(), ...restProps } = $props();
</script>

<BaseTextarea bind:value {...restProps} />
