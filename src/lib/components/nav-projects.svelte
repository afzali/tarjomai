<script>
	import FolderIcon from "@lucide/svelte/icons/folder";
	import EllipsisIcon from "@lucide/svelte/icons/ellipsis";
	import ShareIcon from "@lucide/svelte/icons/share";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import * as Sidebar from "$lib/components/ui-rtl/sidebar/index.js";
	import * as DropdownMenu from "$lib/components/ui-rtl/dropdown-menu/index.js";

	let {
		projects,
	} = $props();

	const sidebar = Sidebar.useSidebar();
</script>

<Sidebar.Group class="group-data-[collapsible=icon]:hidden">
	<Sidebar.GroupLabel>پروژه‌ها</Sidebar.GroupLabel>
	<Sidebar.Menu>
		{#each projects as item (item.name)}
			<Sidebar.MenuItem>
				<Sidebar.MenuButton>
					{#snippet child({ props })}
						<a href={item.url} {...props}>
							<item.icon />
							<span>{item.name}</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuAction showOnHover {...props}>
								<EllipsisIcon />
								<span class="sr-only">بیشتر</span>
							</Sidebar.MenuAction>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content
						class="w-48"
						side={sidebar.isMobile ? "bottom" : "left"}
						align={sidebar.isMobile ? "end" : "start"}
					>
						<DropdownMenu.Item class="text-left">
							<FolderIcon class="text-muted-foreground" />
							<span>مشاهده پروژه</span>
						</DropdownMenu.Item>
						<DropdownMenu.Item class="text-left">
							<ShareIcon class="text-muted-foreground" />
							<span>اشتراک‌گذاری پروژه</span>
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item class="text-left">
							<Trash2Icon class="text-muted-foreground" />
							<span>حذف پروژه</span>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</Sidebar.MenuItem>
		{/each}
		<Sidebar.MenuItem>
			<Sidebar.MenuButton>
				<EllipsisIcon />
				<span>بیشتر</span>
			</Sidebar.MenuButton>
		</Sidebar.MenuItem>
	</Sidebar.Menu>
</Sidebar.Group>