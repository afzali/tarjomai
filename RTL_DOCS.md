# مستندات کامل RTL - shadcn-svelte

> نسخه RTL (راست به چپ) کامل از shadcn-svelte برای زبان‌های فارسی، عربی و عبری

**🎉 آماده برای استفاده به عنوان Template پروژه!**

---

## 📋 فهرست

- [معرفی](#معرفی)
- [نصب و راه‌اندازی](#نصب-و-راهاندازی)
- [استفاده](#استفاده)
- [معماری](#معماری)
- [کامپوننت‌ها](#کامپوننتها)
- [فونت فارسی](#فونت-فارسی)
- [بروزرسانی](#بروزرسانی)
- [عیب‌یابی](#عیبیابی)
- [مثال‌ها](#مثالها)

---

## معرفی

این پروژه یک سیستم **RTL کامل و قابل نگهداری** برای shadcn-svelte ارائه می‌دهد که:

- ✅ **54 کامپوننت** را پوشش می‌دهد
- ✅ **قابل نگهداری** - جدا از کد اصلی
- ✅ **قابل بروزرسانی** - با یک دستور
- ✅ **خودکار** - تبدیل هوشمند کلاس‌ها
- ✅ **فونت فارسی** - Vazirmatn از Google Fonts

### چرا جداسازی؟

- کامپوننت‌های اصلی shadcn دست نخورده می‌مانند
- آپدیت shadcn بدون مشکل
- می‌توانید هم LTR و هم RTL داشته باشید
- بدون performance overhead
- SSR-safe

---

## نصب و راه‌اندازی

### 1. تولید کامپوننت‌های RTL

```bash
npm run rtl:generate
```

این دستور:
- تمام کامپوننت‌های `ui/` را اسکن می‌کند
- نسخه RTL آن‌ها را در `ui-rtl/` ایجاد می‌کند
- به صورت هوشمند تشخیص می‌دهد کدام کامپوننت نیاز به تبدیل RTL دارد

### 2. فایل‌های ایجاد شده

```
src/lib/
├── rtl-utils.js                    # توابع کمکی RTL
├── rtl-context.svelte.js           # Context API
├── components/
│   ├── rtl-provider.svelte         # Provider کامپوننت
│   ├── ui/                         # کامپوننت‌های اصلی (دست نخورده)
│   └── ui-rtl/                     # کامپوننت‌های RTL (تولید شده)
│       ├── accordion/
│       ├── alert/
│       ├── button/
│       └── ... (54 کامپوننت)
│
scripts/
└── generate-rtl-components.js      # اسکریپت تولید خودکار
```

---

## استفاده

### روش 1: استفاده مستقیم

```svelte
<script>
  import { Button } from "$lib/components/ui-rtl/button";
  import { Card } from "$lib/components/ui-rtl/card";
</script>

<div dir="rtl" lang="fa">
  <Button>دکمه فارسی</Button>
  <Card>کارت با پشتیبانی RTL</Card>
</div>
```

### روش 2: با RTL Provider (پیشنهادی)

```svelte
<script>
  import RtlProvider from "$lib/components/rtl-provider.svelte";
  import { Button } from "$lib/components/ui-rtl/button";
  import { Card, CardHeader, CardTitle, CardContent } from "$lib/components/ui-rtl/card";
</script>

<RtlProvider rtl={true} lang="fa">
  <Card>
    <CardHeader>
      <CardTitle>عنوان کارت</CardTitle>
    </CardHeader>
    <CardContent>
      <Button>دکمه عملیات</Button>
    </CardContent>
  </Card>
</RtlProvider>
```

### روش 3: در Layout

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import RtlProvider from "$lib/components/rtl-provider.svelte";
  import { page } from "$app/stores";
  
  $: isRtl = $page.params.lang === 'fa' || $page.params.lang === 'ar';
</script>

<RtlProvider rtl={isRtl} lang={isRtl ? 'fa' : 'en'}>
  <slot />
</RtlProvider>
```

---

## معماری

### تفاوت اصلی: `cn` → `cnRtl`

```javascript
// ui/button/button.svelte (اصلی)
import { cn } from "$lib/utils.js";
class={cn("pl-4 mr-2", className)}

// ui-rtl/button/button.svelte (RTL)
import { cnRtl } from "$lib/rtl-utils.js";
class={cnRtl("pl-4 mr-2", className)}
// خروجی: "pr-4 ml-2"
```

### دو نوع کامپوننت

#### 1. Wrapper (ساده)

```svelte
<!-- ui-rtl/badge/badge.svelte -->
<script module>
  export { badgeVariants } from '$lib/components/ui/badge/badge.svelte';
</script>

<script>
  import BaseBadge from '$lib/components/ui/badge/badge.svelte';
  let props = $props();
</script>

<BaseBadge {...props} />
```

#### 2. Converted (با تبدیل)

```svelte
<!-- ui-rtl/dropdown-menu/dropdown-menu-content.svelte -->
<script>
  import { cnRtl } from "$lib/rtl-utils.js";
  // ... cn → cnRtl
</script>
```

### تبدیل‌های خودکار

| LTR | RTL |
|-----|-----|
| `pl-4` | `pr-4` |
| `mr-2` | `ml-2` |
| `border-r` | `border-l` |
| `rounded-l` | `rounded-r` |
| `text-left` | `text-right` |
| `justify-start` | `justify-end` |
| `slide-in-from-left` | `slide-in-from-right` |
| `translate-x-[calc(100%-2px)]` | `-translate-x-[calc(100%-2px)]` |

---

## کامپوننت‌ها

### لیست کامل (54 کامپوننت)

| دسته | کامپوننت‌ها |
|------|------------|
| **Layout** | Card, Separator, Aspect Ratio, Resizable |
| **Navigation** | Breadcrumb, Menubar, Navigation Menu, Pagination, Tabs |
| **Forms** | Input, Textarea, Checkbox, Radio Group, Switch, Select, Slider |
| **Buttons** | Button, Button Group, Toggle, Toggle Group |
| **Overlays** | Dialog, Alert Dialog, Sheet, Drawer, Popover, Hover Card, Tooltip |
| **Menus** | Dropdown Menu, Context Menu, Command |
| **Feedback** | Alert, Progress, Spinner, Skeleton, Sonner |
| **Data** | Table, Data Table, Calendar, Range Calendar |
| **Advanced** | Accordion, Collapsible, Carousel, Chart, Sidebar, Form, Field |
| **Typography** | Label, Badge, KBD |
| **Misc** | Avatar, Empty, Input Group, Input OTP, Item, Scroll Area |

### کامپوننت‌های خاص با تبدیل RTL

این کامپوننت‌ها نیاز به تبدیل خاص دارند:

- **Switch** - animation direction (+ CSS fix در `app.css`)
- **Sheet** - slide direction
- **Drawer** - slide direction
- **Dropdown Menu** - positioning
- **Select** - positioning
- **Context Menu** - positioning
- **Breadcrumb** - separator direction
- **Pagination** - prev/next buttons
- **Sidebar** - positioning
- **Calendar** - navigation buttons

**نکته مهم:** Switch نیاز به CSS اضافی دارد چون Tailwind arbitrary values با data attributes را به صورت خودکار handle نمی‌کند.

---

## فونت فارسی

### Vazirmatn از Google Fonts

فونت **Vazirmatn** به صورت پیش‌فرض نصب شده است.

#### تنظیمات (src/app.html)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100..900&display=swap" rel="stylesheet" />
```

#### استایل (src/app.css)

```css
body {
  font-family: 'Vazirmatn', system-ui, -apple-system, sans-serif;
}

[dir="rtl"],
[lang="fa"],
[lang="ar"] {
  font-family: 'Vazirmatn', 'Segoe UI', Tahoma, sans-serif;
}
```

#### وزن‌های فونت

```svelte
<p class="font-thin">100 - Thin</p>
<p class="font-light">300 - Light</p>
<p class="font-normal">400 - Regular</p>
<p class="font-medium">500 - Medium</p>
<p class="font-semibold">600 - Semi Bold</p>
<p class="font-bold">700 - Bold</p>
<p class="font-black">900 - Black</p>
```

### تغییر فونت

برای استفاده از فونت دیگر:

1. تغییر در `app.html`
2. تغییر در `app.css`
3. تغییر در `rtl-provider.svelte`

---

## بروزرسانی

### آپدیت shadcn

```bash
# روش 1: همه چیز با هم
npm run rtl:update

# روش 2: مرحله به مرحله
npx shadcn-svelte@latest update
npm run rtl:generate
```

### فرآیند بروزرسانی

1. shadcn کامپوننت‌های `ui/` را آپدیت می‌کند
2. `ui-rtl/` دست نخورده می‌ماند
3. اسکریپت را اجرا کنید
4. `ui-rtl/` دوباره تولید می‌شود
5. تمام! ✨

---

## عیب‌یابی

### ❌ خطای Export (buttonVariants, etc.)

```bash
npm run rtl:generate
```

### ❌ کامپوننت‌ها RTL نیستند

1. از `ui-rtl/` import کنید نه `ui/`
2. `dir="rtl"` را اضافه کنید
3. اسکریپت را اجرا کنید

### ❌ Switch animation اشتباه است

این مشکل حل شده است! CSS لازم در `src/app.css` اضافه شده.

اگر هنوز کار نمی‌کند:

**راه‌حل 1: Hard Refresh**

```bash
Ctrl + Shift + R  # در مرورگر
```

**راه‌حل 2: Restart Dev Server**

```bash
# Ctrl+C در terminal
npm run dev
```

**بررسی در DevTools:**

1. F12 → Elements
2. روی Switch کلیک راست → Inspect
3. باید ببینید: `data-[state=checked]:-translate-x-[calc(100%-2px)]`
4. اگر `-` ندارد، `npm run rtl:generate` را اجرا کنید

### ❌ Import Error

```bash
# Dev server را restart کنید
npm run dev
```

### ❌ بعد از آپدیت کار نمی‌کند

```bash
npm run rtl:update
```

### Debug Tips

```bash
# چک کردن فایل‌ها
ls src/lib/components/ui-rtl/button/

# چک کردن محتوا
cat src/lib/components/ui-rtl/button/button.svelte

# پاک کردن و شروع مجدد
rm -rf src/lib/components/ui-rtl
npm run rtl:generate
```

---

## مثال‌ها

### مثال 1: فرم ورود

```svelte
<script>
  import RtlProvider from "$lib/components/rtl-provider.svelte";
  import { Button } from "$lib/components/ui-rtl/button";
  import { Input } from "$lib/components/ui-rtl/input";
  import { Label } from "$lib/components/ui-rtl/label";
  import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "$lib/components/ui-rtl/card";
</script>

<RtlProvider rtl={true} lang="fa">
  <div class="container mx-auto p-8">
    <Card class="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>ورود به حساب کاربری</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <Label for="email">ایمیل</Label>
          <Input id="email" type="email" placeholder="example@email.com" />
        </div>
        <div class="space-y-2">
          <Label for="password">رمز عبور</Label>
          <Input id="password" type="password" placeholder="••••••••" />
        </div>
      </CardContent>
      <CardFooter>
        <Button class="w-full">ورود</Button>
      </CardFooter>
    </Card>
  </div>
</RtlProvider>
```

### مثال 2: داشبورد

```svelte
<script>
  import RtlProvider from "$lib/components/rtl-provider.svelte";
  import { Card, CardHeader, CardTitle, CardContent } from "$lib/components/ui-rtl/card";
  import { Button } from "$lib/components/ui-rtl/button";
  import { Badge } from "$lib/components/ui-rtl/badge";
</script>

<RtlProvider rtl={true} lang="fa">
  <div class="p-8 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">داشبورد</h1>
      <Button>افزودن جدید</Button>
    </div>
    
    <div class="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center justify-between">
            کاربران
            <Badge>۱۲۳</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">۱,۲۳۴</p>
          <p class="text-sm text-muted-foreground">+۱۰٪ از ماه قبل</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center justify-between">
            فروش
            <Badge variant="secondary">۴۵۶</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">۵,۶۷۸</p>
          <p class="text-sm text-muted-foreground">+۲۰٪ از ماه قبل</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center justify-between">
            درآمد
            <Badge variant="outline">۷۸۹</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">۹۸,۷۶۵ تومان</p>
          <p class="text-sm text-muted-foreground">+۱۵٪ از ماه قبل</p>
        </CardContent>
      </Card>
    </div>
  </div>
</RtlProvider>
```

### مثال 3: چندزبانه

```svelte
<script>
  import { Button as ButtonLTR } from "$lib/components/ui/button";
  import { Button as ButtonRTL } from "$lib/components/ui-rtl/button";
  
  let lang = $state('fa');
</script>

<div class="p-8 space-y-4">
  <div class="flex gap-2">
    <button onclick={() => lang = 'en'}>English</button>
    <button onclick={() => lang = 'fa'}>فارسی</button>
  </div>
  
  {#if lang === 'en'}
    <div dir="ltr" lang="en">
      <ButtonLTR>English Button</ButtonLTR>
    </div>
  {:else}
    <div dir="rtl" lang="fa">
      <ButtonRTL>دکمه فارسی</ButtonRTL>
    </div>
  {/if}
</div>
```

---

## دستورات مفید

```bash
# تولید کامپوننت‌های RTL
npm run rtl:generate

# آپدیت shadcn + تولید RTL
npm run rtl:update

# اجرای dev server
npm run dev

# چک کردن syntax
npm run check

# پاک کردن و شروع مجدد
rm -rf src/lib/components/ui-rtl
npm run rtl:generate
```

---

## نکات مهم

### ✅ انجام دهید

- از `ui-rtl/` import کنید برای صفحات فارسی
- `dir="rtl"` و `lang="fa"` را اضافه کنید
- از `RtlProvider` استفاده کنید
- بعد از آپدیت shadcn، اسکریپت را اجرا کنید

### ❌ انجام ندهید

- کامپوننت‌های `ui/` را تغییر ندهید
- کامپوننت‌های `ui-rtl/` را دستی ویرایش نکنید
- `dir="rtl"` را فراموش نکنید
- از `ui/` برای متن فارسی استفاده نکنید

---

## لایسنس

MIT - مانند shadcn-svelte

---

**ساخته شده با ❤️ برای جامعه فارسی‌زبان**

اگر این پروژه برایتان مفید بود، ⭐ بدهید!
