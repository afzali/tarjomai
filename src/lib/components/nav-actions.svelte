<script module>
	import ArrowDownIcon from "@lucide/svelte/icons/arrow-down";
	import ArrowUpIcon from "@lucide/svelte/icons/arrow-up";
	import BellIcon from "@lucide/svelte/icons/bell";
	import ChartLineIcon from "@lucide/svelte/icons/chart-line";
	import CopyIcon from "@lucide/svelte/icons/copy";
	import CornerUpLeftIcon from "@lucide/svelte/icons/corner-up-left";
	import CornerUpRightIcon from "@lucide/svelte/icons/corner-up-right";
	import FileTextIcon from "@lucide/svelte/icons/file-text";
	import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end";
	import LinkIcon from "@lucide/svelte/icons/link";
	import Settings2Icon from "@lucide/svelte/icons/settings-2";
	import TrashIcon from "@lucide/svelte/icons/trash";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";

	const data = [
		[
			{
				label: "سفارشی‌سازی صفحه",
				icon: Settings2Icon,
			},
			{
				label: "تبدیل به ویکی",
				icon: FileTextIcon,
			},
		],
		[
			{
				label: "کپی لینک",
				icon: LinkIcon,
			},
			{
				label: "تکثیر",
				icon: CopyIcon,
			},
			{
				label: "انتقال به",
				icon: CornerUpRightIcon,
			},
			{
				label: "انتقال به زباله‌دان",
				icon: Trash2Icon,
			},
		],
		[
			{
				label: "برگشت",
				icon: CornerUpLeftIcon,
			},
			{
				label: "مشاهده آمار",
				icon: ChartLineIcon,
			},
			{
				label: "تاریخچه نسخه‌ها",
				icon: GalleryVerticalEndIcon,
			},
			{
				label: "نمایش صفحات حذف‌شده",
				icon: TrashIcon,
			},
			{
				label: "اعلان‌ها",
				icon: BellIcon,
			},
		],
		[
			{
				label: "وارد کردن",
				icon: ArrowUpIcon,
			},
			{
				label: "خروجی گرفتن",
				icon: ArrowDownIcon,
			},
		],
	];
</script>

<script>
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Popover from "$lib/components/ui-rtl/popover/index.js";
	import * as Sidebar from "$lib/components/ui-rtl/sidebar/index.js";
	import EllipsisIcon from "@lucide/svelte/icons/ellipsis";
	import StarIcon from "@lucide/svelte/icons/star";
	import { untrack } from "svelte";

	let open = $state(false);

	$effect(() => {
		untrack(() => {
			open = true;
		});
	});
</script>

<div class="flex items-center gap-2 text-sm">
	<div class="text-muted-foreground hidden font-medium md:inline-block">ویرایش مهر 08</div>
	<Button variant="ghost" size="icon" class="size-7">
		<StarIcon />
	</Button>
	<Popover.Root bind:open>
		<Popover.Trigger>
			{#snippet child({ props })}
				<Button
					{...props}
					variant="ghost"
					size="icon"
					class="data-[state=open]:bg-accent size-7"
				>
					<EllipsisIcon />
				</Button>
			{/snippet}
		</Popover.Trigger>
		<Popover.Content class="w-56 overflow-hidden rounded-lg p-0" align="start">
			<Sidebar.Root collapsible="none" class="bg-transparent">
				<Sidebar.Content>
					{#each data as group, index (index)}
						<Sidebar.Group class="border-b last:border-none">
							<Sidebar.GroupContent class="gap-0">
								<Sidebar.Menu>
									{#each group as item, index (index)}
										<Sidebar.MenuItem>
											<Sidebar.MenuButton
												class="hover:bg-accent hover:text-accent-foreground flex-row-reverse text-right"
											>
												<item.icon /> <span>{item.label}</span>
											</Sidebar.MenuButton>
										</Sidebar.MenuItem>
									{/each}
								</Sidebar.Menu>
							</Sidebar.GroupContent>
						</Sidebar.Group>
					{/each}
				</Sidebar.Content>
			</Sidebar.Root>
		</Popover.Content>
	</Popover.Root>
</div>