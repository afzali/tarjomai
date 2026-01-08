<script lang="ts" module>
  // sample data
  const data = {
    navMain: [
      {
        title: "شروع کار",
        url: "#",
        items: [
          {
            title: "نصب و راه‌اندازی",
            url: "#",
          },
          {
            title: "ساختار پروژه",
            url: "#",
          },
        ],
      },
      {
        title: "ساخت برنامه",
        url: "#",
        items: [
          {
            title: "مسیریابی",
            url: "#",
          },
          {
            title: "دریافت داده",
            url: "#",
            isActive: true,
          },
          {
            title: "رندرینگ",
            url: "#",
          },
          {
            title: "کش کردن",
            url: "#",
          },
          {
            title: "استایل‌دهی",
            url: "#",
          },
          {
            title: "بهینه‌سازی",
            url: "#",
          },
          {
            title: "پیکربندی",
            url: "#",
          },
          {
            title: "تست",
            url: "#",
          },
          {
            title: "احراز هویت",
            url: "#",
          },
          {
            title: "استقرار",
            url: "#",
          },
          {
            title: "ارتقا",
            url: "#",
          },
          {
            title: "نمونه‌ها",
            url: "#",
          },
        ],
      },
      {
        title: "مرجع API",
        url: "#",
        items: [
          {
            title: "کامپوننت‌ها",
            url: "#",
          },
          {
            title: "قراردادهای فایل",
            url: "#",
          },
          {
            title: "توابع",
            url: "#",
          },
          {
            title: "تنظیمات next.config.js",
            url: "#",
          },
          {
            title: "خط فرمان",
            url: "#",
          },
          {
            title: "محیط Edge",
            url: "#",
          },
        ],
      },
      {
        title: "معماری",
        url: "#",
        items: [
          {
            title: "دسترسی‌پذیری",
            url: "#",
          },
          {
            title: "بارگذاری سریع",
            url: "#",
          },
          {
            title: "کامپایلر Next.js",
            url: "#",
          },
          {
            title: "مرورگرهای پشتیبانی‌شده",
            url: "#",
          },
          {
            title: "Turbopack",
            url: "#",
          },
        ],
      },
      {
        title: "انجمن",
        url: "#",
        items: [
          {
            title: "راهنمای مشارکت",
            url: "#",
          },
        ],
      },
    ],
  };
</script>
<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end";
  import type { ComponentProps } from "svelte";
  let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();
</script>
<Sidebar.Root variant="floating" {...restProps}>
  <Sidebar.Header>
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton size="lg">
          {#snippet child({ props })}
            <a href="##" {...props}>
              <div
                class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
              >
                <GalleryVerticalEndIcon class="size-4" />
              </div>
              <div class="flex flex-col gap-0.5 leading-none text-right flex-1">
                <span class="font-medium">مستندات</span>
                <span class="text-xs opacity-70">نسخه 1.0.0</span>
              </div>
            </a>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.Menu class="gap-2">
        {#each data.navMain as item (item.title)}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href={item.url} class="font-medium" {...props}>
                  {item.title}
                </a>
              {/snippet}
            </Sidebar.MenuButton>
            {#if item.items?.length}
              <Sidebar.MenuSub class="ml-0 border-l-0 px-1.5">
                {#each item.items as subItem (subItem.title)}
                  <Sidebar.MenuSubItem>
                    <Sidebar.MenuSubButton isActive={subItem.isActive}>
                      {#snippet child({ props })}
                        <a href={subItem.url} {...props}>{subItem.title}</a>
                      {/snippet}
                    </Sidebar.MenuSubButton>
                  </Sidebar.MenuSubItem>
                {/each}
              </Sidebar.MenuSub>
            {/if}
          </Sidebar.MenuItem>
        {/each}
      </Sidebar.Menu>
    </Sidebar.Group>
  </Sidebar.Content>
</Sidebar.Root>