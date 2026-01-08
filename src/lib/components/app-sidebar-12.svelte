<script lang="ts" module>
  // This is sample data.
  const data = {
    user: {
      name: "علی رضایی",
      email: "ali@example.com",
      avatar: "/avatars/shadcn.jpg",
    },
    calendars: [
      {
        name: "تقویم‌های من",
        items: ["شخصی", "کاری", "خانوادگی"],
      },
      {
        name: "علاقه‌مندی‌ها",
        items: ["تعطیلات", "تولدها"],
      },
      {
        name: "سایر",
        items: ["سفر", "یادآوری‌ها", "ضرب‌الاجل‌ها"],
      },
    ],
  };
</script>
<script lang="ts">
  import Calendars from "./calendars.svelte";
  import DatePicker from "./date-picker.svelte";
  import NavUser from "./nav-user.svelte";
  import * as Sidebar from "$lib/components/ui-rtl/sidebar/index.js";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import type { ComponentProps } from "svelte";
  let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();
</script>
<Sidebar.Root bind:ref {...restProps}>
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
  <Sidebar.Rail />
</Sidebar.Root>