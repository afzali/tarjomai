<script>
	import AppSidebar from "$lib/components/app-sidebar-09.svelte";
	import * as Breadcrumb from "$lib/components/ui-rtl/breadcrumb/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui-rtl/sidebar/index.js";
</script>

<Sidebar.Provider style="--sidebar-width: 350px;">
	<AppSidebar side="right" />
	<Sidebar.Inset>
		<header class="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="ms-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item class="hidden md:block">
						<Breadcrumb.Link href="#">همه صندوق‌ها</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator class="hidden md:block" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>صندوق ورودی</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</header>
		<div class="flex flex-1 flex-col gap-4 p-4">
			{#each Array.from({ length: 24 }) as _, index (index)}
				<div class="bg-muted/50 aspect-video h-12 w-full rounded-lg"></div>
			{/each}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>