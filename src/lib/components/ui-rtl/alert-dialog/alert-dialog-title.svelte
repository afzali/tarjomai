<script>
	import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
	import { cnRtl } from "$lib/rtl-utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	} = $props();
</script>

<AlertDialogPrimitive.Title
	bind:ref
	data-slot="alert-dialog-title"
	class={cnRtl("text-lg font-semibold text-right", className)}
	{...restProps}
/>