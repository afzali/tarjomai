<script>
	import BaseInput from '$lib/components/ui/input/input.svelte';
	
	let { value = $bindable(), ...restProps } = $props();
</script>

<BaseInput bind:value {...restProps} />
