<script>
	import * as DropdownMenu from "$lib/components/ui-rtl/dropdown-menu/index.js";
	import * as Sidebar from "$lib/components/ui-rtl/sidebar/index.js";
	import { useSidebar } from "$lib/components/ui-rtl/sidebar/index.js";
	import ArrowUpRightIcon from "@lucide/svelte/icons/arrow-up-right";
	import EllipsisIcon from "@lucide/svelte/icons/ellipsis";
	import LinkIcon from "@lucide/svelte/icons/link";
	import StarOffIcon from "@lucide/svelte/icons/star-off";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";

	let { favorites } = $props();

	const sidebar = useSidebar();
</script>

<Sidebar.Group class="group-data-[collapsible=icon]:hidden">
	<Sidebar.GroupLabel>علاقه‌مندی‌ها</Sidebar.GroupLabel>
	<Sidebar.Menu>
		{#each favorites as item (item.name)}
			<Sidebar.MenuItem>
				<Sidebar.MenuButton>
					{#snippet child({ props })}
						<a href={item.url} title={item.name} {...props}>
							<span>{item.emoji}</span>
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
						class="w-56 rounded-lg"
						side={sidebar.isMobile ? "bottom" : "left"}
						align={sidebar.isMobile ? "end" : "start"}
					>
						<DropdownMenu.Item class="text-left">
							<StarOffIcon class="text-muted-foreground" />
							<span>حذف از علاقه‌مندی‌ها</span>
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item class="text-left">
							<LinkIcon class="text-muted-foreground" />
							<span>کپی لینک</span>
						</DropdownMenu.Item>
						<DropdownMenu.Item class="text-left">
							<ArrowUpRightIcon class="text-muted-foreground" />
							<span>باز کردن در تب جدید</span>
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item class="text-left">
							<Trash2Icon class="text-muted-foreground" />
							<span>حذف</span>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</Sidebar.MenuItem>
		{/each}
		<Sidebar.MenuItem>
			<Sidebar.MenuButton class="text-sidebar-foreground/70">
				<EllipsisIcon />
				<span>بیشتر</span>
			</Sidebar.MenuButton>
		</Sidebar.MenuItem>
	</Sidebar.Menu>
</Sidebar.Group>