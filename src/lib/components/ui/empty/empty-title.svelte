<script>
	import { cn } from "$lib/utils.js";
	let { class: className, children, ...restProps } = $props();
</script>

<div
	data-slot="empty-title"
	class={cn("text-lg font-medium tracking-tight", className)}
	{...restProps}
>
	{@render children?.()}
</div>