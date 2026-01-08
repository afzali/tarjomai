<script>
	import CameraIcon from "@tabler/icons-svelte/icons/camera";
	import ChartBarIcon from "@tabler/icons-svelte/icons/chart-bar";
	import DashboardIcon from "@tabler/icons-svelte/icons/dashboard";
	import DatabaseIcon from "@tabler/icons-svelte/icons/database";
	import FileAiIcon from "@tabler/icons-svelte/icons/file-ai";
	import FileDescriptionIcon from "@tabler/icons-svelte/icons/file-description";
	import FileWordIcon from "@tabler/icons-svelte/icons/file-word";
	import FolderIcon from "@tabler/icons-svelte/icons/folder";
	import HelpIcon from "@tabler/icons-svelte/icons/help";
	import InnerShadowTopIcon from "@tabler/icons-svelte/icons/inner-shadow-top";
	import ListDetailsIcon from "@tabler/icons-svelte/icons/list-details";
	import ReportIcon from "@tabler/icons-svelte/icons/report";
	import SearchIcon from "@tabler/icons-svelte/icons/search";
	import SettingsIcon from "@tabler/icons-svelte/icons/settings";
	import UsersIcon from "@tabler/icons-svelte/icons/users";
	import NavDocuments from "./nav-documents.svelte";
	import NavMain from "./nav-main-04.svelte";
	import NavSecondary from "./nav-secondary.svelte";
	import NavUser from "./nav-user.svelte";
	import * as Sidebar from "$lib/components/ui-rtl/sidebar/index.js";
	const data = {
		user: {
			name: "علی افضلی",
			email: "ali@example.com",
			avatar: "/avatars/shadcn.jpg",
		},
		navMain: [
			{
				title: "داشبورد",
				url: "#",
				icon: DashboardIcon,
			},
			{
				title: "چرخه حیات",
				url: "#",
				icon: ListDetailsIcon,
			},
			{
				title: "تحلیل‌ها",
				url: "#",
				icon: ChartBarIcon,
			},
			{
				title: "پروژه‌ها",
				url: "#",
				icon: FolderIcon,
			},
			{
				title: "تیم",
				url: "#",
				icon: UsersIcon,
			},
		],
		navClouds: [
			{
				title: "ضبط",
				icon: CameraIcon,
				isActive: true,
				url: "#",
				items: [
					{
						title: "پیشنهادهای فعال",
						url: "#",
					},
					{
						title: "بایگانی شده",
						url: "#",
					},
				],
			},
			{
				title: "پیشنهاد",
				icon: FileDescriptionIcon,
				url: "#",
				items: [
					{
						title: "پیشنهادهای فعال",
						url: "#",
					},
					{
						title: "بایگانی شده",
						url: "#",
					},
				],
			},
			{
				title: "دستورات",
				icon: FileAiIcon,
				url: "#",
				items: [
					{
						title: "پیشنهادهای فعال",
						url: "#",
					},
					{
						title: "بایگانی شده",
						url: "#",
					},
				],
			},
		],
		navSecondary: [
			{
				title: "تنظیمات",
				url: "#",
				icon: SettingsIcon,
			},
			{
				title: "دریافت کمک",
				url: "#",
				icon: HelpIcon,
			},
			{
				title: "جستجو",
				url: "#",
				icon: SearchIcon,
			},
		],
		documents: [
			{
				name: "کتابخانه داده",
				url: "#",
				icon: DatabaseIcon,
			},
			{
				name: "گزارش‌ها",
				url: "#",
				icon: ReportIcon,
			},
			{
				name: "دستیار نوشتاری",
				url: "#",
				icon: FileWordIcon,
			},
		],
	};

	let { ...restProps } = $props();
</script>

<Sidebar.Root collapsible="offcanvas" {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton class="data-[slot=sidebar-menu-button]:!p-1.5">
					{#snippet child({ props })}
						<a href="##" {...props}>
						<InnerShadowTopIcon class="!size-5" />
						<span class="text-base font-semibold">شرکت آکمی</span>
					</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain items={data.navMain} />
		<NavDocuments items={data.documents} />
		<NavSecondary items={data.navSecondary} class="mt-auto" />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser user={data.user} />
	</Sidebar.Footer>
</Sidebar.Root>