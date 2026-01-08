<script lang="ts" module>
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
  // This is sample data.
  const data = {
    teams: [
      {
        name: "شرکت آکمی",
        logo: CommandIcon,
        plan: "سازمانی",
      },
      {
        name: "آکمی کورپ",
        logo: AudioWaveformIcon,
        plan: "نوپا",
      },
      {
        name: "ایول کورپ",
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
        title: "سوال از هوش مصنوعی",
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
        title: "قالب‌ها",
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
        name: "مجموعه دستور غذایی خانوادگی",
        url: "#",
        emoji: "🍳",
      },
      {
        name: "پیگیر آمادگی جسمانی",
        url: "#",
        emoji: "💪",
      },
      {
        name: "یادداشت کتاب و لیست خواندن",
        url: "#",
        emoji: "📚",
      },
      {
        name: "نکات باغبانی پایدار",
        url: "#",
        emoji: "🌱",
      },
      {
        name: "پیشرفت یادگیری زبان",
        url: "#",
        emoji: "🗣️",
      },
      {
        name: "ایده‌های بازسازی خانه",
        url: "#",
        emoji: "🏠",
      },
      {
        name: "امور مالی شخصی",
        url: "#",
        emoji: "💰",
      },
      {
        name: "لیست فیلم و سریال",
        url: "#",
        emoji: "🎬",
      },
      {
        name: "پیگیر عادت روزانه",
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
            name: "خاطرات روزانه",
            url: "#",
            emoji: "📔",
          },
          {
            name: "پیگیر سلامتی",
            url: "#",
            emoji: "🍏",
          },
          {
            name: "رشد شخصی و اهداف",
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
            name: "اهداف شغلی",
            url: "#",
            emoji: "🎯",
          },
          {
            name: "یادگیری مهارت",
            url: "#",
            emoji: "🧠",
          },
          {
            name: "شبکه‌سازی",
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
            name: "ایده‌های نوشتاری",
            url: "#",
            emoji: "✍️",
          },
          {
            name: "نمونه‌کار هنری",
            url: "#",
            emoji: "🖼️",
          },
          {
            name: "آهنگسازی موسیقی",
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
            name: "بودجه خانوار",
            url: "#",
            emoji: "💰",
          },
          {
            name: "برنامه نگهداری خانه",
            url: "#",
            emoji: "🔧",
          },
          {
            name: "تقویم خانوادگی",
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
            name: "برنامه‌ریزی سفر",
            url: "#",
            emoji: "🗺️",
          },
          {
            name: "لیست آرزوهای سفر",
            url: "#",
            emoji: "🌎",
          },
          {
            name: "خاطرات سفر",
            url: "#",
            emoji: "📸",
          },
        ],
      },
    ],
  };
</script>
<script lang="ts">
  import NavFavorites from "./nav-favorites.svelte";
  import NavMain from "./nav-main-03.svelte";
  import NavSecondary from "./nav-secondary.svelte";
  import NavWorkspaces from "./nav-workspaces.svelte";
  import TeamSwitcher from "./team-switcher.svelte";
  import * as Sidebar from "$lib/components/ui-rtl/sidebar/index.js";
  import type { ComponentProps } from "svelte";
  let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();
</script>
<Sidebar.Root bind:ref class="border-r-0" {...restProps}>
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