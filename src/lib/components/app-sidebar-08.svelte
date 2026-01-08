<script lang="ts" module>
  import BookOpenIcon from "@lucide/svelte/icons/book-open";
  import BotIcon from "@lucide/svelte/icons/bot";
  import ChartPieIcon from "@lucide/svelte/icons/chart-pie";
  import FrameIcon from "@lucide/svelte/icons/frame";
  import LifeBuoyIcon from "@lucide/svelte/icons/life-buoy";
  import MapIcon from "@lucide/svelte/icons/map";
  import SendIcon from "@lucide/svelte/icons/send";
  import Settings2Icon from "@lucide/svelte/icons/settings-2";
  import SquareTerminalIcon from "@lucide/svelte/icons/square-terminal";
  const data = {
    user: {
      name: "علی احمدی",
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
            title: "نشان‌شده‌ها",
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
            title: "شروع کنید",
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
  import NavSecondary from "./nav-secondary.svelte";
  import NavUser from "./nav-user.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import CommandIcon from "@lucide/svelte/icons/command";
  import type { ComponentProps } from "svelte";
  let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();
</script>
<Sidebar.Root bind:ref variant="inset" {...restProps}>
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
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-medium text-right">شرکت آکمی</span>
                <span class="truncate text-xs text-right">سازمانی</span>
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