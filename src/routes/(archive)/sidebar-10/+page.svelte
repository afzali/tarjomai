<script>
	import AppSidebar from "$lib/components/app-sidebar-10.svelte";
	import NavActions from "$lib/components/nav-actions.svelte";
	import * as Breadcrumb from "$lib/components/ui-rtl/breadcrumb/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui-rtl/sidebar/index.js";
</script>

<Sidebar.Provider>
	<AppSidebar side="right" />
	<Sidebar.Inset>
		<header class="flex h-14 shrink-0 items-center gap-2">
			<div class="flex flex-1 items-center gap-2 px-3">
				<Sidebar.Trigger />
				<Separator orientation="vertical" class="ms-2 data-[orientation=vertical]:h-4" />
				<Breadcrumb.Root>
					<Breadcrumb.List>
						<Breadcrumb.Item>
							<Breadcrumb.Page class="line-clamp-1">
								مدیریت پروژه و پیگیری وظایف
							</Breadcrumb.Page>
						</Breadcrumb.Item>
					</Breadcrumb.List>
				</Breadcrumb.Root>
			</div>
			<div class="ms-auto px-3">
				<NavActions />
			</div>
		</header>
		<div class="flex flex-1 flex-col gap-4 px-4 py-10">
			<div class="bg-muted/50 mx-auto h-24 w-full max-w-3xl rounded-xl"></div>
			<div class="bg-muted/50 mx-auto h-full w-full max-w-3xl rounded-xl"></div>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>