<script>
	import AudioWaveformIcon from "@lucide/svelte/icons/audio-waveform";
	import BlocksIcon from "@lucide/svelte/icons/blocks";
	import CalendarIcon from "@lucide/svelte/icons/calendar";
	import CommandIcon from "@lucide/svelte/icons/command";
	import HouseIcon from "@lucide/svelte/icons/house";
	import InboxIcon from "@lucide/svelte/icons/inbox";
	import MessageCircleQuestionIcon from "@lucide/svelte/icons/message-circle-question";
	import SearchIcon from "@lucide/svelte/icons/search";
	import Settings2Icon from "@lucide/svelte/icons/settings-2";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";

	import NavFavorites from "./nav-favorites.svelte";
	import NavMain from "./nav-main.svelte";
	import NavSecondary from "./nav-secondary.svelte";
	import NavWorkspaces from "./nav-workspaces.svelte";
	import TeamSwitcher from "./team-switcher.svelte";
	import * as Sidebar from "$lib/components/ui-rtl/sidebar/index.js";
	// This is sample data.
	const data = {
		teams: [
			{
				name: "شرکت آکمی",
				logo: CommandIcon,
				plan: "سازمانی",
			},
			{
				name: "شرکت  مفتی",
				logo: AudioWaveformIcon,
				plan: "استارتاپ",
			},
			{
				name: "شرکت الکی",
				logo: CommandIcon,
				plan: "رایگان",
			},
		],
		navMain: [
			{
				title: "جستجو",
				url: "#",
				icon: SearchIcon,
			},
			{
				title: "از هوش مصنوعی بپرسید",
				url: "#",
				icon: SparklesIcon,
			},
			{
				title: "خانه",
				url: "#",
				icon: HouseIcon,
				isActive: true,
			},
			{
				title: "صندوق ورودی",
				url: "#",
				icon: InboxIcon,
				badge: "10",
			},
		],
		navSecondary: [
			{
				title: "تقویم",
				url: "#",
				icon: CalendarIcon,
			},
			{
				title: "تنظیمات",
				url: "#",
				icon: Settings2Icon,
			},
			{
				title: "الگوها",
				url: "#",
				icon: BlocksIcon,
			},
			{
				title: "سطل زباله",
				url: "#",
				icon: Trash2Icon,
			},
			{
				title: "راهنما",
				url: "#",
				icon: MessageCircleQuestionIcon,
			},
		],
		favorites: [
			{
				name: "مدیریت پروژه و پیگیری وظایف",
				url: "#",
				emoji: "📊",
			},
			{
				name: "مجموعه دستورهای خانوادگی و برنامه‌ریزی وعده‌ها",
				url: "#",
				emoji: "🍳",
			},
			{
				name: "ردیاب تناسب اندام و برنامه‌های تمرینی",
				url: "#",
				emoji: "💪",
			},
			{
				name: "یادداشت‌های کتاب و فهرست مطالعه",
				url: "#",
				emoji: "📚",
			},
			{
				name: "نکات باغبانی پایدار و مراقبت از گیاه",
				url: "#",
				emoji: "🌱",
			},
			{
				name: "پیشرفت یادگیری زبان و منابع",
				url: "#",
				emoji: "🗣️",
			},
			{
				name: "ایده‌های نوسازی منزل و ردیاب بودجه",
				url: "#",
				emoji: "🏠",
			},
			{
				name: "امور مالی شخصی و سبد سرمایه‌گذاری",
				url: "#",
				emoji: "💰",
			},
			{
				name: "فهرست تماشای فیلم و سریال با نقدها",
				url: "#",
				emoji: "🎬",
			},
			{
				name: "ردیاب عادت‌های روزانه و تعیین اهداف",
				url: "#",
				emoji: "✅",
			},
		],
		workspaces: [
			{
				name: "مدیریت زندگی شخصی",
				emoji: "🏠",
				pages: [
					{
						name: "یادداشت روزانه و بازاندیشی",
						url: "#",
						emoji: "📔",
					},
					{
						name: "ردیاب سلامت و تندرستی",
						url: "#",
						emoji: "🍏",
					},
					{
						name: "رشد فردی و اهداف یادگیری",
						url: "#",
						emoji: "🌟",
					},
				],
			},
			{
				name: "توسعه حرفه‌ای",
				emoji: "💼",
				pages: [
					{
						name: "اهداف شغلی و نقاط عطف",
						url: "#",
						emoji: "🎯",
					},
					{
						name: "کسب مهارت و گزارش آموزش",
						url: "#",
						emoji: "🧠",
					},
					{
						name: "ارتباطات و رویدادهای شبکه‌سازی",
						url: "#",
						emoji: "🤝",
					},
				],
			},
			{
				name: "پروژه‌های خلاقانه",
				emoji: "🎨",
				pages: [
					{
						name: "ایده‌های نویسندگی و طرح داستان",
						url: "#",
						emoji: "✍️",
					},
					{
						name: "نمونه‌کار هنر و طراحی",
						url: "#",
						emoji: "🖼️",
					},
					{
						name: "آهنگ‌سازی و گزارش تمرین",
						url: "#",
						emoji: "🎵",
					},
				],
			},
			{
				name: "مدیریت خانه",
				emoji: "🏡",
				pages: [
					{
						name: "بودجه خانگی و ردیابی هزینه‌ها",
						url: "#",
						emoji: "💰",
					},
					{
						name: "برنامه نگه‌داری خانه و وظایف",
						url: "#",
						emoji: "🔧",
					},
					{
						name: "تقویم خانوادگی و برنامه‌ریزی رویداد",
						url: "#",
						emoji: "📅",
					},
				],
			},
			{
				name: "سفر و ماجراجویی",
				emoji: "🧳",
				pages: [
					{
						name: "برنامه‌ریزی سفر و برنامه‌های سفر",
						url: "#",
						emoji: "🗺️",
					},
					{
						name: "فهرست آرزوهای سفر و الهام",
						url: "#",
						emoji: "🌎",
					},
					{
						name: "ژورنال سفر و گالری عکس",
						url: "#",
						emoji: "📸",
					},
				],
			},
		],
	};

	let { ref = $bindable(null), ...restProps } = $props();
</script>

<Sidebar.Root side="right" class="border-l-0" {...restProps}>
	<Sidebar.Header>
		<TeamSwitcher teams={data.teams} />
		<NavMain items={data.navMain} />
	</Sidebar.Header>
	<Sidebar.Content>
		<NavFavorites favorites={data.favorites} />
		<NavWorkspaces workspaces={data.workspaces} />
		<NavSecondary items={data.navSecondary} class="mt-auto" />
	</Sidebar.Content>
	<Sidebar.Rail />
</Sidebar.Root>