<script>
	import { Button } from "$lib/components/ui-rtl/button/index.js";
	import { Separator } from "$lib/components/ui-rtl/separator/index.js";
	import * as Sidebar from "$lib/components/ui-rtl/sidebar/index.js";
</script>

<header
	class="h-(--header-height) group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) flex shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear"
>
	<div class="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
		<Sidebar.Trigger class="-mr-1" />
		<Separator orientation="vertical" class="mx-2 data-[orientation=vertical]:h-4" />
		<h1 class="text-base font-medium">اسناد</h1>
		<div class="mr-auto flex items-center gap-2">
			<Button
				href="https://github.com/afzali/shadcn-rtl"
				variant="ghost"
				size="sm"
				class="dark:text-foreground hidden sm:flex"
				target="_blank"
				rel="noopener noreferrer"
			>
				گیت‌هاب
			</Button>
		</div>
	</div>
</header>