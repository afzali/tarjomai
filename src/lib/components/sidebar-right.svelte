<script>
	import Calendars from "./calendars.svelte";
	import DatePicker from "./date-picker.svelte";
	import NavUser from "./nav-user.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import PlusIcon from "@lucide/svelte/icons/plus";
	// This is sample data.
	const data = {
		user: {
			name: "shadcn",
			email: "m@example.com",
			avatar: "/avatars/shadcn.jpg",
		},
		calendars: [
			{
				name: "تقویم‌های من",
				items: ["شخصی", "کاری", "خانوادگی"],
			},
			{
				name: "موارد دلخواه",
				items: ["تعطیلات", "تولدها"],
			},
			{
				name: "دیگر",
				items: ["سفر", "یادآوری‌ها", "مهلت‌ها"],
			},
		],
	};

	let { ref = $bindable(null), ...restProps } = $props();
</script>

<Sidebar.Root
	bind:ref
	collapsible="none"
	class="sticky top-0 hidden h-svh border-r lg:flex"
	{...restProps}
>
	<Sidebar.Header class="border-sidebar-border h-16 border-b">
		<NavUser user={data.user} />
	</Sidebar.Header>
	<Sidebar.Content>
		<DatePicker />
		<Sidebar.Separator class="mx-0" />
		<Calendars calendars={data.calendars} />
	</Sidebar.Content>
	<Sidebar.Footer>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton>
					<PlusIcon />
					<span>تقویم جدید</span>
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
</Sidebar.Root>