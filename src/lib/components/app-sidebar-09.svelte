<script lang="ts" module>
  import ArchiveXIcon from "@lucide/svelte/icons/archive-x";
  import FileIcon from "@lucide/svelte/icons/file";
  import InboxIcon from "@lucide/svelte/icons/inbox";
  import SendIcon from "@lucide/svelte/icons/send";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  // این داده‌های نمونه هستند
  const data = {
    user: {
      name: "علی احمدی",
      email: "m@example.com",
      avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
      {
        title: "صندوق ورودی",
        url: "#",
        icon: InboxIcon,
        isActive: true,
      },
      {
        title: "پیش‌نویس‌ها",
        url: "#",
        icon: FileIcon,
        isActive: false,
      },
      {
        title: "ارسال‌شده",
        url: "#",
        icon: SendIcon,
        isActive: false,
      },
      {
        title: "هرزنامه",
        url: "#",
        icon: ArchiveXIcon,
        isActive: false,
      },
      {
        title: "سطل زباله",
        url: "#",
        icon: Trash2Icon,
        isActive: false,
      },
    ],
    mails: [
      {
        name: "علی رضایی",
        email: "williamsmith@example.com",
        subject: "ملاقات فردا",
        date: "09:34 AM",
        teaser: "سلام تیم، فقط یادآوری در مورد جلسه فردا در ساعت 10 صبح.\nلطفا با به‌روزرسانی پروژه‌های خود آماده شوید.",
      },
      {
        name: "مریم احمدی",
        email: "alicesmith@example.com",
        subject: "Re: به‌روزرسانی پروژه",
        date: "دیروز",
        teaser: "ممنون از به‌روزرسانی. پیشرفت تا الان خوب به نظر می‌رسه.\nبیایید برای بحث در مورد گام‌های بعدی تماس تلفنی برنامه‌ریزی کنیم.",
      },
      {
        name: "رضا محمدی",
        email: "bobjohnson@example.com",
        subject: "برنامه‌های آخر هفته",
        date: "2 روز پیش",
        teaser: "سلام همه! دارم فکر می‌کنم برای یک گشت و گذار تیمی آخر هفته برنامه‌ریزی کنم.\nآیا علاقه دارید به یک گشت کوهنوردی یا روز ساحلی بروید؟",
      },
      {
        name: "فاطمه کریمی",
        email: "emilydavis@example.com",
        subject: "Re: سوال در مورد بودجه",
        date: "2 روز پیش",
        teaser: "شما اعداد بودجه‌ای که فرستادید رو بررسی کردم.\nمی‌تونیم برای بحث در مورد تعدیلات احتمالی تماس تلفنی برنامه‌ریزی کنیم؟",
      },
      {
        name: "حسین رضوی",
        email: "michaelwilson@example.com",
        subject: "اعلامیه مهم",
        date: "1 هفته پیش",
        teaser: "لطفا برای جلسه تمام کارکنان جمعه ساعت 3 عصر با ما همراه شوید.\nما خبرهای جالب و هیجان‌انگیزی در مورد آینده شرکت داریم.",
      },
      {
        name: "سارا حسینی",
        email: "sarahbrown@example.com",
        subject: "Re: بازخورد در مورد پیشنهاد",
        date: "1 هفته پیش",
        teaser: "ممنون که پیشنهاد رو فرستادی. من اون رو بررسی کردم و نظراتی دارم.\nمی‌تونیم جلسه‌ای برای بحث در مورد نظراتم برنامه‌ریزی کنیم؟",
      },
      {
        name: "داود عباسی",
        email: "davidlee@example.com",
        subject: "پروژه جدید",
        date: "1 هفته پیش",
        teaser: "من دارم به یک مفهوم پروژه جالب فکر می‌کنم.\nآیا این هفته وقت داری تا در مورد تأثیر و امکان‌پذیری اون با هم بحث کنیم؟",
      },
      {
        name: "نیلوفر محمدی",
        email: "oliviawilson@example.com",
        subject: "برنامه‌های تعطیلات",
        date: "1 هفته پیش",
        teaser: "فقط یادآوری که من ماه آینده دو هفته تعطیلات دارم.\nمن مطمئن میشم که پروژه‌هام قبل از رفتنم به‌روز باشه.",
      },
      {
        name: "محمد رضایی",
        email: "jamesmartin@example.com",
        subject: "Re: ثبت‌نام در کنفرانس",
        date: "1 هفته پیش",
        teaser: "من ثبت‌نام برای کنفرانس تکنولوژی رو تکمیل کردم.\nاگر نیاز به اطلاعات اضافی از طرف من دارید به من اطلاع بدید.",
      },
      {
        name: "زهرا بیاتی",
        email: "sophiawhite@example.com",
        subject: "شام تیمی",
        date: "1 هفته پیش",
        teaser: "برای جشن موفقیت پروژه اخیر، می‌خوام شام تیمی برنامه‌ریزی کنم.\nآیا شب جمعه این هفته در دسترس هستید؟ لطفا ترجیحات خودتون رو به من اطلاع بدید.",
      },
    ],
  };
</script>
<script lang="ts">
  import NavUser from "./nav-user.svelte";
  import { Label } from "$lib/components/ui-rtl/label/index.js";
  import { useSidebar } from "$lib/components/ui-rtl/sidebar/context.svelte.js";
  import * as Sidebar from "$lib/components/ui-rtl/sidebar/index.js";
  import { Switch } from "$lib/components/ui-rtl/switch/index.js";
  import CommandIcon from "@lucide/svelte/icons/command";
  import type { ComponentProps } from "svelte";
  let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();
  let activeItem = $state(data.navMain[0]);
  let mails = $state(data.mails);
  const sidebar = useSidebar();
</script>
<Sidebar.Root
  bind:ref
  collapsible="icon"
  class="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row"
  {...restProps}
>
  <!-- این اولین نوار کناری است -->
  <!-- ما قابلیت 收缩 را غیرفعال می‌کنیم و عرض را به آیکون تنظیم می‌کنیم -->
  <!-- این باعث می‌شود نوار کناری به شکل آیکون‌ها ظاهر شود -->
  <Sidebar.Root collapsible="none" class="!w-[calc(var(--sidebar-width-icon)_+_1px)] border-r">
    <Sidebar.Header>
      <Sidebar.Menu>
        <Sidebar.MenuItem>
          <Sidebar.MenuButton size="lg" class="md:h-8 md:p-0">
            {#snippet child({ props })}
              <a href="##" {...props}>
                <div
                  class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
                >
                  <CommandIcon class="size-4" />
                </div>
                <div class="grid flex-1 text-left text-sm leading-tight">
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
      <Sidebar.Group>
        <Sidebar.GroupContent class="px-1.5 md:px-0">
          <Sidebar.Menu>
            {#each data.navMain as item (item.title)}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  tooltipContentProps={{
                    hidden: false,
                  }}
                  onclick={() => {
                    activeItem = item;
                    const mail = data.mails.sort(() => Math.random() - 0.5);
                    mails = mail.slice(
                      0,
                      Math.max(5, Math.floor(Math.random() * 10) + 1)
                    );
                    sidebar.setOpen(true);
                  }}
                  isActive={activeItem.title === item.title}
                  class="px-2.5 md:px-2"
                >
                  {#snippet tooltipContent()}
                    {item.title}
                  {/snippet}
                  <item.icon />
                  <span>{item.title}</span>
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            {/each}
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    </Sidebar.Content>
    <Sidebar.Footer>
      <NavUser user={data.user} />
    </Sidebar.Footer>
  </Sidebar.Root>
  <!-- این دومین نوار کناری است -->
  <!-- ما قابلیت 收缩 را غیرفعال می‌کنیم و اجازه می‌دهیم فضای باقیمانده را پر کند -->
  <Sidebar.Root collapsible="none" class="hidden flex-1 md:flex">
    <Sidebar.Header class="gap-3.5 border-b p-4">
      <div class="flex w-full items-center justify-between">
        <div class="text-foreground text-base font-medium">
          {activeItem.title}
        </div>
        <Label class="flex items-center gap-2 text-sm">
          <span>خوانده‌نشده</span>
          <Switch class="shadow-none" />
        </Label>
      </div>
      <Sidebar.Input placeholder="جستجو کنید..." />
    </Sidebar.Header>
    <Sidebar.Content>
      <Sidebar.Group class="px-0">
        <Sidebar.GroupContent>
          {#each mails as mail (mail.email)}
            <a
              href="##"
              class="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 whitespace-nowrap border-b p-4 text-sm leading-tight last:border-b-0"
            >
              <div class="flex w-full items-center gap-2">
                <span>{mail.name}</span>
                <span class="ms-auto text-xs">{mail.date}</span>
              </div>
              <span class="font-medium">{mail.subject}</span>
              <span class="line-clamp-2 w-[260px] whitespace-break-spaces text-xs">
                {mail.teaser}
              </span>
            </a>
          {/each}
        </Sidebar.GroupContent>
      </Sidebar.Group>
    </Sidebar.Content>
  </Sidebar.Root>
</Sidebar.Root>