<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import type { ComponentProps } from "svelte";
  // This is sample data.
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
  let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();
</script>
<Sidebar.Root bind:ref {...restProps}>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel>فهرست مطالب</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each data.navMain as item (item.title)}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton class="font-medium text-right">
                {#snippet child({ props })}
                  <a href={item.url} {...props} class="{props.class} text-right">
                    {item.title}
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
              {#if item.items?.length}
                <Sidebar.MenuSub>
                  {#each item.items as subItem (subItem.title)}
                    <Sidebar.MenuSubItem>
                      <Sidebar.MenuSubButton
                        href={subItem.url}
                        isActive={subItem.isActive}
                      >
                        {subItem.title}
                      </Sidebar.MenuSubButton>
                    </Sidebar.MenuSubItem>
                  {/each}
                </Sidebar.MenuSub>
              {/if}
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
  <Sidebar.Rail />
</Sidebar.Root>