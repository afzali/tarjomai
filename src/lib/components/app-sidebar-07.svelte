<script lang="ts" module>
  import AudioWaveformIcon from "@lucide/svelte/icons/audio-waveform";
  import BookOpenIcon from "@lucide/svelte/icons/book-open";
  import BotIcon from "@lucide/svelte/icons/bot";
  import ChartPieIcon from "@lucide/svelte/icons/chart-pie";
  import CommandIcon from "@lucide/svelte/icons/command";
  import FrameIcon from "@lucide/svelte/icons/frame";
  import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end";
  import MapIcon from "@lucide/svelte/icons/map";
  import Settings2Icon from "@lucide/svelte/icons/settings-2";
  import SquareTerminalIcon from "@lucide/svelte/icons/square-terminal";
  // این داده‌های نمونه هستند.
  const data = {
    user: {
      name: "علی احمدی",
      email: "m@example.com",
      avatar: "/avatars/shadcn.jpg",
    },
    teams: [
      {
        name: "شرکت آکمی",
        logo: GalleryVerticalEndIcon,
        plan: "سازمانی",
      },
      {
        name: "آکمی کورپ",
        logo: AudioWaveformIcon,
        plan: "استارتاپ",
      },
      {
        name: "ایول کورپ",
        logo: CommandIcon,
        plan: "رایگان",
      },
    ],
    navMain: [
      {
        title: "محیط آزمایش",
        url: "#",
        icon: SquareTerminalIcon,
        isActive: true,
        items: [
          {
            title: "تاریخچه",
            url: "#",
          },
          {
            title: "ستاره‌دار",
            url: "#",
          },
          {
            title: "تنظیمات",
            url: "#",
          },
        ],
      },
      {
        title: "مدل‌ها",
        url: "#",
        icon: BotIcon,
        items: [
          {
            title: "جنسیس",
            url: "#",
          },
          {
            title: "اکسپلورر",
            url: "#",
          },
          {
            title: "کوانتوم",
            url: "#",
          },
        ],
      },
      {
        title: "مستندات",
        url: "#",
        icon: BookOpenIcon,
        items: [
          {
            title: "معرفی",
            url: "#",
          },
          {
            title: "شروع کار",
            url: "#",
          },
          {
            title: "آموزش‌ها",
            url: "#",
          },
          {
            title: "تغییرات",
            url: "#",
          },
        ],
      },
      {
        title: "تنظیمات",
        url: "#",
        icon: Settings2Icon,
        items: [
          {
            title: "عمومی",
            url: "#",
          },
          {
            title: "تیم",
            url: "#",
          },
          {
            title: "صورتحساب",
            url: "#",
          },
          {
            title: "محدودیت‌ها",
            url: "#",
          },
        ],
      },
    ],
    projects: [
      {
        name: "مهندسی طراحی",
        url: "#",
        icon: FrameIcon,
      },
      {
        name: "فروش و بازاریابی",
        url: "#",
        icon: ChartPieIcon,
      },
      {
        name: "سفر",
        url: "#",
        icon: MapIcon,
      },
    ],
  };
</script>
<script lang="ts">
  import NavMain from "./nav-main-02.svelte";
  import NavProjects from "./nav-projects.svelte";
  import NavUser from "./nav-user.svelte";
  import TeamSwitcher from "./team-switcher-01.svelte";
  import * as Sidebar from "$lib/components/ui-rtl/sidebar/index.js";
  import type { ComponentProps } from "svelte";
  let {
    ref = $bindable(null),
    collapsible = "icon",
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props();
</script>
<Sidebar.Root {collapsible} {...restProps}>
  <Sidebar.Header>
    <TeamSwitcher teams={data.teams} />
  </Sidebar.Header>
  <Sidebar.Content>
    <NavMain items={data.navMain} />
    <NavProjects projects={data.projects} />
  </Sidebar.Content>
  <Sidebar.Footer>
    <NavUser user={data.user} />
  </Sidebar.Footer>
  <Sidebar.Rail />
</Sidebar.Root>