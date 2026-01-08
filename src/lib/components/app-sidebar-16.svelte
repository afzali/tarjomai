<script lang="ts" module>
  import SquareTerminalIcon from "@lucide/svelte/icons/square-terminal";
  import BotIcon from "@lucide/svelte/icons/bot";
  import BookOpenIcon from "@lucide/svelte/icons/book-open";
  import Settings2Icon from "@lucide/svelte/icons/settings-2";
  import LifeBuoyIcon from "@lucide/svelte/icons/life-buoy";
  import SendIcon from "@lucide/svelte/icons/send";
  import FrameIcon from "@lucide/svelte/icons/frame";
  import PieChartIcon from "@lucide/svelte/icons/pie-chart";
  import MapIcon from "@lucide/svelte/icons/map";
  import CommandIcon from "@lucide/svelte/icons/command";
  const data = {
    user: {
      name: "shadcn",
      email: "m@example.com",
      avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
      {
        title: "محیط آزمایشی",
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
            title: "Genesis",
            url: "#",
          },
          {
            title: "Explorer",
            url: "#",
          },
          {
            title: "Quantum",
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
            title: "مقدمه",
            url: "#",
          },
          {
            title: "شروع کنید",
            url: "#",
          },
          {
            title: "آموزش‌ها",
            url: "#",
          },
          {
            title: "تغییرات نسخه‌ها",
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
    navSecondary: [
      {
        title: "پشتیبانی",
        url: "#",
        icon: LifeBuoyIcon,
      },
      {
        title: "بازخورد",
        url: "#",
        icon: SendIcon,
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
        icon: PieChartIcon,
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
  import type { ComponentProps } from "svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import NavMain from "./nav-main.svelte";
  import NavProjects from "./nav-projects.svelte";
  import NavSecondary from "./nav-secondary.svelte";
  import NavUser from "./nav-user.svelte";
  let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();
</script>
<Sidebar.Root class="top-(--header-height) h-[calc(100svh-var(--header-height))]!" {...restProps}>
  <Sidebar.Header>
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton size="lg">
          {#snippet child({ props })}
            <a href="##" {...props}>
              <div
                class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
              >
                <CommandIcon class="size-4" />
              </div>
              <div class="grid flex-1 text-right text-sm leading-tight">
                <span class="truncate font-medium">شرکت آکمی</span>
                <span class="truncate text-xs">سازمانی</span>
              </div>
            </a>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Header>
  <Sidebar.Content>
    <NavMain items={data.navMain} />
    <NavProjects projects={data.projects} />
    <NavSecondary items={data.navSecondary} class="mt-auto" />
  </Sidebar.Content>
  <Sidebar.Footer>
    <NavUser user={data.user} />
  </Sidebar.Footer>
</Sidebar.Root>