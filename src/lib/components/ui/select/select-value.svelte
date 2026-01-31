<script>
	import { Select as SelectPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		placeholder = "",
		...restProps
	} = $props();
</script>

<span
	bind:this={ref}
	data-slot="select-value"
	class={cn("pointer-events-none", className)}
	{...restProps}
>
	<SelectPrimitive.Value {placeholder} />
</span>
