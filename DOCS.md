# 🌐 ترجمای (Tarjomai) — مستندات یکپارچه

> ابزار هوشمند پردازش متن (ترجمه، ویراستاری و بیشتر) — کاملاً مرورگرمحور

[![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=flat&logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![IndexedDB](https://img.shields.io/badge/IndexedDB-Offline_First-green)](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

[English](#english-overview) | [فارسی](#مرور-کلی-فارسی) | [RTL Components](#rtl-components) | [Architecture Plan](#architecture-plan)

---

## English Overview

### ✨ Features

- 🌐 **Browser-Only** — all code runs in the browser, no server needed
- 🔒 **Privacy First** — no data is sent to a server
- 💾 **Offline-First** — storage via IndexedDB (Dexie)
- 🤖 **Multi-LLM** — connect to multiple models via OpenRouter
- 📊 **Model Comparison** — compare translations from multiple models with elapsed time
- ⏹️ **Per-Model Cancellation** — cancel individual model requests without stopping others
- 📝 **Style Analysis** — AI-powered writing style analysis
- 🎯 **Sentence-Aligned** — paragraph-by-paragraph display of source and output
- ✏️ **Editorial Operation** — AI-assisted editing with semantic diff, per-change revert, and inline review
- 🎨 **RTL Support** — full Persian / Arabic right-to-left support
- 🌍 **Custom Languages** — add custom language codes used across all projects
- 📦 **Project Backup (Export/Import JSON)** — export/import one or more books from the dashboard
- 🔀 **Sorting** — sort dashboard by name, created date, or last modified
- ⚙️ **Default Language Settings** — set default source/target languages for new projects

### 📦 Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — project list and creation |
| `/settings` | OpenRouter and app settings |
| `/projects/new` | Create new project (choose operation type) |
| `/projects/[id]` | Translation workspace |
| `/projects/[id]/editorial` | Editorial workspace |
| `/projects/[id]/editorial-setup` | Editorial wizard (3 steps) |
| `/projects/[id]/analyze` | Style analysis |
| `/projects/[id]/compare` | Model comparison with cancellation |
| `/projects/[id]/select-model` | Final model selection |
| `/projects/[id]/quick-setup` | Quick setup without AI analysis |

### 🚀 Getting Started

**Prerequisites:** Node.js 18+, npm or pnpm

```bash
git clone https://github.com/afzali/tarjomai.git
cd tarjomai
npm install
npm run dev
```

Runs at `http://localhost:5173`.

### 🔧 Commands

```bash
npm run dev           # development server
npm run build         # production build
npm run preview       # preview build
npm run check         # TypeScript check
npm run rtl:generate  # generate RTL components
npm run rtl:update    # update shadcn + generate RTL
npm run lint          # lint code
```

### 📚 Usage

#### Language Settings

- **Default Languages** — set preferred source/target in Settings; auto-selected for new projects
- **Custom Languages** — add any language code/name in Settings; appears in all dropdowns

#### Model Comparison with Cancellation

- Click "شروع مقایسه" to start comparing selected models
- Each model shows real-time progress with elapsed time
- Cancel individual models without stopping others
- Cancel all with "لغو همه"

#### Backup / Restore (JSON)

- **Export:** Dashboard → `خروجی / ورودی` → select projects → `خروجی JSON`
- **Import:** Dashboard → `خروجی / ورودی` → `ورودی JSON` (or `وارد کردن از فایل` when list is empty)
- Imported projects are added as new; existing data is never overwritten

#### RTL Components

```svelte
<script>
  import { Button } from "$lib/components/ui-rtl/button";
  import { Card } from "$lib/components/ui-rtl/card";
</script>

<Card>
  <Button>Persian Button</Button>
</Card>
```

#### RTL Provider

```svelte
<script>
  import RtlProvider from "$lib/components/rtl-provider.svelte";
</script>

<RtlProvider rtl={true} lang="fa">
  <!-- Your content -->
</RtlProvider>
```

### 🎨 Customization

**Font** — defined in `src/app.html` and `src/app.css`:

```css
body {
  font-family: 'Vazirmatn', system-ui, sans-serif;
}
```

**Theme** — CSS variables in `src/app.css`:

```css
:root {
  --primary: oklch(0.208 0.042 265.755);
  --background: oklch(1 0 0);
  /* ... */
}
```

### 🔄 Updating shadcn-svelte

```bash
# Automatic
npm run rtl:update

# Manual
npx shadcn-svelte@latest update
npm run rtl:generate
```

### 🌐 Language Support

**Built-in:** Persian, Arabic, German, French, Spanish, Italian, Russian, Chinese, Japanese, Turkish, English

**Custom:** Add any language code and name via Settings.

### 📄 License

MIT — same as shadcn-svelte

### 🙏 Credits

- [shadcn-svelte](https://shadcn-svelte.com)
- [SvelteKit](https://kit.svelte.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Vazirmatn](https://github.com/rastikerdar/vazirmatn)

---

## مرور کلی فارسی

### ✨ ویژگی‌ها

- 🌐 **مرورگرمحور** — بدون سرور، همه کد در مرورگر اجرا می‌شود
- 🔒 **حریم خصوصی اول** — هیچ داده‌ای به سرور ارسال نمی‌شود
- 💾 **آفلاین-اول** — ذخیره‌سازی با IndexedDB
- 🤖 **چند مدل** — اتصال به مدل‌های مختلف از طریق OpenRouter
- 📊 **مقایسه مدل‌ها** — مقایسه ترجمه چند مدل با نمایش زمان
- ⏹️ **لغو بر اساس مدل** — لغو هر مدل به صورت جداگانه
- 📝 **تحلیل سبک** — تحلیل سبک نگارش با AI
- 🎯 **همراستای پاراگراف** — نمایش پاراگراف‌به‌پاراگراف متن و خروجی
- ✏️ **عملیات ویراستاری** — ویرایش با AI، نمایش دف معنایی، امکان revert هر تغییر
- 🎨 **پشتیبانی RTL** — پشتیبانی کامل از فارسی و راست‌به‌چپ
- 🌍 **زبان‌های سفارشی** — افزودن کدهای زبانی دلخواه
- 📦 **پشتیبان‌گیری JSON** — خروجی/ورودی پروژه‌ها از داشبورد
- 🔀 **مرتب‌سازی** — مرتب‌سازی بر اساس نام، تاریخ ساخت یا آخرین ویرایش
- ⚙️ **تنظیمات پیش‌فرض** — زبان پیش‌فرض برای پروژه‌های جدید

### 📦 صفحات

| مسیر | شرح |
|------|-----|
| `/` | داشبورد |
| `/settings` | تنظیمات |
| `/projects/new` | پروژه جدید (انتخاب نوع عملیات) |
| `/projects/[id]` | فضای کار ترجمه |
| `/projects/[id]/editorial` | فضای کار ویراستاری |
| `/projects/[id]/editorial-setup` | راه‌اندازی ویراستاری |
| `/projects/[id]/analyze` | تحلیل سبک |
| `/projects/[id]/compare` | مقایسه مدل‌ها |
| `/projects/[id]/quick-setup` | راه‌اندازی سریع |

### 🚀 نصب

```bash
git clone https://github.com/afzali/tarjomai.git
cd tarjomai
npm install
npm run dev
```

### 🔧 دستورات

```bash
npm run dev           # سرور توسعه
npm run build         # ساخت برای production
npm run preview       # پیش‌نمایش
npm run check         # چک TypeScript
npm run rtl:generate  # تولید کامپوننت‌های RTL
npm run rtl:update    # بروزرسانی shadcn + RTL
npm run lint          # lint
```

### 📖 ساختار پروژه

```
tarjomai/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/               # shadcn (LTR)
│   │   │   ├── ui-rtl/           # shadcn (RTL، تولیدشده)
│   │   │   └── tarjomai/         # کامپوننت‌های اختصاصی
│   │   ├── db/                   # IndexedDB (Dexie)
│   │   ├── services/             # سرویس‌های داده
│   │   │   ├── openrouter.service.js
│   │   │   ├── operationConfig.service.js
│   │   │   └── settings.service.js
│   │   ├── stores/               # Svelte stores
│   │   ├── utils/                # ابزارهای کمکی
│   │   └── prompts/              # پرامپت‌های AI
│   └── routes/
│       └── (app)/
│           ├── settings/
│           └── projects/
│               ├── new/
│               └── [id]/
│                   ├── editorial/
│                   ├── editorial-setup/
│                   ├── analyze/
│                   ├── compare/
│                   └── quick-setup/
├── scripts/
│   └── generate-rtl.js
└── static/
```

---

## RTL Components

> سیستم RTL کامل و قابل نگهداری برای shadcn-svelte — برای زبان‌های فارسی، عربی و عبری

### معرفی

این سیستم:
- **54 کامپوننت** را پوشش می‌دهد
- **قابل نگهداری** — جدا از کد اصلی shadcn
- **قابل بروزرسانی** — با یک دستور (`npm run rtl:update`)
- **خودکار** — تبدیل هوشمند کلاس‌های Tailwind از LTR به RTL
- **فونت فارسی Vazirmatn** از Google Fonts

### معماری: `cn` → `cnRtl`

```javascript
// ui/button/button.svelte (اصلی - LTR)
import { cn } from "$lib/utils.js";
class={cn("pl-4 mr-2", className)}

// ui-rtl/button/button.svelte (RTL)
import { cnRtl } from "$lib/rtl-utils.js";
class={cnRtl("pl-4 mr-2", className)}
// خروجی: "pr-4 ml-2"
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

**کامپوننت‌های با تبدیل خاص:** Switch (animation + CSS fix)، Sheet، Drawer، Dropdown Menu، Select، Context Menu، Breadcrumb، Pagination، Sidebar، Calendar.

### استفاده

**روش مستقیم:**
```svelte
<script>
  import { Button } from "$lib/components/ui-rtl/button";
  import { Card } from "$lib/components/ui-rtl/card";
</script>

<div dir="rtl" lang="fa">
  <Button>دکمه فارسی</Button>
</div>
```

**روش RTL Provider (پیشنهادی):**
```svelte
<script>
  import RtlProvider from "$lib/components/rtl-provider.svelte";
  import { Button } from "$lib/components/ui-rtl/button";
</script>

<RtlProvider rtl={true} lang="fa">
  <Button>دکمه فارسی</Button>
</RtlProvider>
```

**در Layout:**
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

### فونت فارسی (Vazirmatn)

**`src/app.html`:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100..900&display=swap" rel="stylesheet" />
```

**`src/app.css`:**
```css
body {
  font-family: 'Vazirmatn', system-ui, -apple-system, sans-serif;
}
[dir="rtl"], [lang="fa"], [lang="ar"] {
  font-family: 'Vazirmatn', 'Segoe UI', Tahoma, sans-serif;
}
```

### قوانین مهم RTL

- ✅ از `ui-rtl/` import کنید برای صفحات فارسی
- ✅ `dir="rtl"` و `lang="fa"` را اضافه کنید
- ✅ بعد از آپدیت shadcn، `npm run rtl:generate` اجرا کنید
- ❌ کامپوننت‌های `ui/` را مستقیم تغییر ندهید
- ❌ کامپوننت‌های `ui-rtl/` را دستی ویرایش نکنید — از `scripts/generate-rtl.js` تغییرات را اعمال کنید

### عیب‌یابی

| مشکل | راه‌حل |
|------|---------|
| خطای Export (buttonVariants, ...) | `npm run rtl:generate` |
| کامپوننت‌ها RTL نیستند | از `ui-rtl/` import کنید + `dir="rtl"` |
| Switch animation اشتباه | Hard refresh مرورگر یا `npm run rtl:generate` |
| بعد از آپدیت کار نمی‌کند | `npm run rtl:update` |

### مثال: فرم ورود

```svelte
<script>
  import RtlProvider from "$lib/components/rtl-provider.svelte";
  import { Button } from "$lib/components/ui-rtl/button";
  import { Input } from "$lib/components/ui-rtl/input";
  import { Label } from "$lib/components/ui-rtl/label";
  import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "$lib/components/ui-rtl/card";
</script>

<RtlProvider rtl={true} lang="fa">
  <Card class="max-w-md mx-auto">
    <CardHeader><CardTitle>ورود به حساب کاربری</CardTitle></CardHeader>
    <CardContent class="space-y-4">
      <div class="space-y-2">
        <Label for="email">ایمیل</Label>
        <Input id="email" type="email" placeholder="example@email.com" />
      </div>
    </CardContent>
    <CardFooter>
      <Button class="w-full">ورود</Button>
    </CardFooter>
  </Card>
</RtlProvider>
```

---

## Architecture Plan

> بازطراحی ترجمای به پلتفرم چندعملیاتی

### زیرساخت فعلی

- **فریمورک:** SvelteKit v2 + Svelte 5 + TailwindCSS v4
- **ذخیره‌سازی:** Dexie (IndexedDB) — در حال مهاجرت از v4 به v5/v6
- **AI:** OpenRouter API — `src/lib/services/openrouter.service.js`
- **عملیات فعال:** ترجمه (`translation`) + ویراستاری (`editorial`)

### طرح دیتابیس (Schema v5)

```
projects:        ++id, title, createdAt, updatedAt, operationType, folderId
chapters:        ++id, projectId, order, status, outputText, segmentData
operationConfig: ++id, projectId, operationType, name, isPreset
folders:         ++id, name, parentId, createdAt, updatedAt
```

**شکل Segment (ویراستاری):**
```js
{
  index: number,
  sourceText: string,
  outputText: string,
  status: 'pending' | 'accepted' | 'rejected' | 'edited',
  editedText: string | null
}
```

**شکل operationConfig ویراستاری:**
```js
{
  operationType: 'editorial',
  options: {
    normalizeUnicode: boolean,
    replaceHalfSpaces: boolean,
    fixSpelling: boolean,
    grammarCorrection: boolean,
    customInstructions: string
  },
  systemPrompt: string,
  promptMode: 'auto' | 'manual'
}
```

### رجیستری عملیات

```js
// src/lib/operations/index.js
export const OPERATIONS = {
  translation: {
    id: 'translation', label: 'ترجمه', icon: 'languages',
    workspaceRoute: (id) => `/projects/${id}`
  },
  editorial: {
    id: 'editorial', label: 'ویرایش', icon: 'pencil-line',
    wizardEntry: (id) => `/projects/${id}/editorial-setup`,
    workspaceRoute: (id) => `/projects/${id}/editorial`
  }
}
```

### سیستم نوع فایل

| نوع | پسوند | رنگ |
|-----|-------|-----|
| ترجمه | `.trj` | آبی |
| ویراستاری | `.vry` | بنفش |

### Wizard عمومی (WizardShell)

کامپوننت `src/lib/components/tarjomai/wizard-shell.svelte` یک wrapper برای همه wizard pageها با:
- StepBar نمایش مراحل
- دکمه‌های قبلی/بعدی
- validation قبل از ادامه

### فازهای اجرا

| فاز | کار | اولویت |
|-----|-----|---------|
| 1 | مهاجرت Dexie (v5+v6) | ⭐ بحرانی |
| 2 | سرویس‌های `operationConfig`، `folders`، `chapters` | ⭐ بحرانی |
| 3 | بررسی سلامت ترجمه | ⭐ بحرانی |
| 4 | سیستم نوع فایل | بالا |
| 5 | رجیستری عملیات + wizard definitions | بالا |
| 6 | WizardShell | بالا |
| 7 | جریان پروژه جدید (انتخاب نوع عملیات) | بالا |
| 8 | بازطراحی داشبورد (FileManager + فیلتر) | بالا |
| 9 | Wizard ویراستاری | بالا |
| 10 | محیط ویراستاری + segment review | بالا |
| 11 | استخراج ReviewPanel + text-selection chat | متوسط |
| 12 | پنل‌های resizable | متوسط |

---

## Editorial Workspace

> محیط ویراستاری — پیاده‌سازی شده در `src/routes/(app)/projects/[id]/editorial/+page.svelte`

### ساختار Layout

```
┌─ Sidebar ──────┬─ Main ────────────────────────────────┐
│ لیست فصول      │  نوار ابزار (عنوان · config · خروجی)  │
│ [فصل ۱]        ├───────────────────────────────────────┤
│ [فصل ۲] ✓      │  ستون چپ: متن مبدأ (BlockEditor)      │
│ ...            │  ستون راست: خروجی / ویرایش‌شده        │
└────────────────┴───────────────────────────────────────┘
```

### تشخیص Drift (انحراف از Snapshot)

هر block یک `snapshot` از لحظه پردازش موفق ذخیره می‌کند. هنگام ویرایش مبدأ:
- اگر متن با snapshot فرق داشت → نشانگر "خارج از سینک" نشان داده می‌شود
- دکمه سینک مجدد یا تأیید ویرایش دستی ارائه می‌شود

### Semantic Diff (دف معنایی)

دف بین متن مبدأ و خروجی با الگوریتم LCS روی tokenهای کلمه/فضا انجام می‌شود. هر تغییر به یکی از این انواع تقسیم می‌شود:

| نوع | رنگ | توضیح |
|-----|-----|-------|
| `space` | نارنجی | تغییر فاصله |
| `halfspace` | بنفش | تغییر نیم‌فاصله (ZWNJ) |
| `punct` | زرد | تغییر علامت نگارشی |
| `word` | قرمز/سبز | تغییر کلمه/املا |

در نمایش diff:
- **ستون مبدأ:** توکن‌های حذف‌شده با خط روی آن‌ها (`line-through`)
- **ستون خروجی:** توکن‌های اضافه‌شده با پس‌زمینه رنگی

### Revert per Change

هر توکن تغییریافته قابل کلیک است. با کلیک:
1. Popover باز می‌شود و نوع تغییر و متن مبدأ را نشان می‌دهد
2. دکمه "بازگردانی" آن تغییر خاص را به متن مبدأ برمی‌گرداند (بدون تأثیر روی سایر تغییرات)
3. نتیجه در `editedText` ذخیره و به IndexedDB نوشته می‌شود

**منطق revert (در `revertChange`):**

```js
// برای هر token در rich diff:
// - equal → حفظ می‌شود
// - pairId مطابق هدف → نسخه remove (مبدأ) جایگزین می‌شود
// - سایر pairIdها → نسخه add (خروجی فعلی) حفظ می‌شود
```

### جریان پردازش AI

1. متن مبدأ به پاراگراف‌ها تقسیم می‌شود (BlockEditor)
2. هر پاراگراف به OpenRouter با prompt ویراستاری ارسال می‌شود
3. خروجی به صورت streaming دریافت و در `outputText` block ذخیره می‌شود
4. بعد از هر block موفق، `snapshot` به‌روز می‌شود
5. در صورت ویرایش بعدی مبدأ، drift با snapshot مقایسه می‌شود

### Paste Handling در BlockEditor

کامپوننت `src/lib/components/tarjomai/block-editor.svelte` برای paste:
1. متن plain را استخراج می‌کند (بدون HTML/فرمت)
2. پیش از کارت، متن قبل از cursor را حفظ می‌کند
3. اولین پاراگراف paste را به block جاری اضافه می‌کند
4. پاراگراف‌های بعدی block‌های جدید ایجاد می‌کنند
5. DOM sync برای focused block اجباری انجام می‌شود

### گزینه‌های Wizard ویراستاری

```
[✓] نرمال‌سازی یونیکد
[ ] جایگزینی نیم‌فاصله با فاصله کامل
[✓] تصحیح غلط‌های املایی
[✓] پیشنهادات تصحیح دستوری
────────────────────────
دستورات سفارشی: [___]
```

---

**ساخته شده با ❤️ برای جامعه فارسی‌زبان**

اگر این پروژه برایتان مفید بود، ⭐ بدهید!
