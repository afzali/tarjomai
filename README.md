# 🌐 ترجمای (Tarjomai)

> ابزار ترجمه و مقایسه هوشمند متون - کاملاً مرورگرمحور

[![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=flat&logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![IndexedDB](https://img.shields.io/badge/IndexedDB-Offline_First-green)](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

[فارسی](./README.fa.md) | English

## ✨ Features

- 🌐 **Browser-Only** - تمام کد در مرورگر اجرا می‌شود، بدون سرور
- 🔒 **Privacy First** - هیچ داده‌ای به سرور ارسال نمی‌شود
- 💾 **Offline-First** - ذخیره‌سازی با IndexedDB
- 🤖 **Multi-LLM** - اتصال به مدل‌های مختلف از طریق OpenRouter
- 📊 **Model Comparison** - مقایسه ترجمه چند مدل
- 📝 **Style Analysis** - تحلیل سبک نگارش با AI
- 🎯 **Sentence-Aligned** - نمایش جمله‌به‌جمله متن و ترجمه
- 🎨 **RTL Support** - پشتیبانی کامل از فارسی و راست‌به‌چپ

## 📦 Contents

### Main Pages

- **Dashboard** - `/` - لیست پروژه‌ها و ایجاد پروژه جدید
- **Settings** - `/settings` - تنظیمات OpenRouter و برنامه
- **New Project** - `/projects/new` - ایجاد پروژه جدید
- **Workspace** - `/projects/[id]` - فضای کار اصلی ترجمه

### Guided Setup Flow

- **Style Analysis** - `/projects/[id]/analyze` - تحلیل سبک نگارش
- **Model Comparison** - `/projects/[id]/compare` - مقایسه مدل‌ها
- **Model Selection** - `/projects/[id]/select-model` - انتخاب مدل نهایی

### Quick Setup

- **Quick Setup** - `/projects/[id]/quick-setup` - تنظیم سریع بدون تحلیل AI

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the project
git clone https://github.com/afzali/tarjomai.git
cd tarjomai

# Install dependencies
npm install

# Run the project
npm run dev
```

The project will run at `http://localhost:5173`

## 📚 Usage

### Using RTL Components

```svelte
<script>
  import { Button } from "$lib/components/ui-rtl/button";
  import { Card } from "$lib/components/ui-rtl/card";
</script>

<Card>
  <Button>Persian Button</Button>
</Card>
```

### Using RTL Provider

```svelte
<script>
  import RtlProvider from "$lib/components/rtl-provider.svelte";
</script>

<RtlProvider rtl={true} lang="fa">
  <!-- Your content -->
</RtlProvider>
```

## 🔧 Commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Preview build
npm run preview

# Type check
npm run check

# Generate RTL components
npm run rtl:generate

# Update shadcn + generate RTL
npm run rtl:update
```

## 📖 Project Structure

```
tarjomai/
├── docs/                         # مستندات پروژه
│   ├── PROJECT.md                # مشخصات فنی
│   ├── USER-JOURNEY.md           # مسیر کاربر
│   └── TASKS.md                  # وظایف پروژه
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/               # shadcn components (LTR)
│   │   │   ├── ui-rtl/           # shadcn components (RTL)
│   │   │   └── tarjomai/         # کامپوننت‌های اختصاصی
│   │   ├── db/                   # IndexedDB (Dexie)
│   │   ├── services/             # سرویس‌های داده
│   │   ├── stores/               # Svelte stores
│   │   ├── utils/                # ابزارهای کمکی
│   │   └── prompts/              # پرامپت‌های AI
│   ├── routes/
│   │   ├── (app)/                # صفحات اصلی
│   │   │   ├── settings/
│   │   │   └── projects/
│   │   └── (archive)/            # صفحات نمونه shadcn
│   └── app.css
├── scripts/
│   └── generate-rtl.js
└── static/
```

## 🎨 Customization

### Change Font

Font is defined in `src/app.html` and `src/app.css`:

```css
/* src/app.css */
body {
  font-family: 'Vazirmatn', system-ui, sans-serif;
}
```

### Change Theme

Colors are defined in `src/app.css` using CSS variables:

```css
:root {
  --primary: oklch(0.208 0.042 265.755);
  --background: oklch(1 0 0);
  /* ... */
}
```

## 🔄 Updates

### Update shadcn-svelte

```bash
# Method 1: Automatic update
npm run rtl:update

# Method 2: Manual
npx shadcn-svelte@latest update
npm run rtl:generate
```

## 📝 RTL Components

All 54 shadcn-svelte components with RTL support:

- Accordion, Alert, Alert Dialog, Aspect Ratio, Avatar
- Badge, Breadcrumb, Button, Button Group, Calendar
- Card, Carousel, Chart, Checkbox, Collapsible
- Command, Context Menu, Data Table, Dialog, Drawer
- Dropdown Menu, Empty, Field, Form, Hover Card
- Input, Input Group, Input OTP, Item, KBD
- Label, Menubar, Navigation Menu, Pagination, Popover
- Progress, Radio Group, Range Calendar, Resizable, Scroll Area
- Select, Separator, Sheet, Sidebar, Skeleton
- Slider, Sonner, Spinner, Switch, Table
- Tabs, Textarea, Toggle, Toggle Group, Tooltip

## 🌐 Language Support

- ✅ Persian (فارسی)
- ✅ Arabic (العربية)
- ✅ Hebrew (עברית)
- ✅ English

## 🤝 Contributing

This project is open source. To contribute:

1. Fork the repository
2. Create a new branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - Same as shadcn-svelte

## 🙏 Credits

- [shadcn-svelte](https://shadcn-svelte.com) - Original components
- [SvelteKit](https://kit.svelte.dev) - Framework
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Vazirmatn](https://github.com/rastikerdar/vazirmatn) - Persian font

## 📞 Support

- 📖 [Full Documentation](./docs/PROJECT.md)
- 🐛 [Report Issues](https://github.com/afzali/tarjomai/issues)
- 💬 [Discussions](https://github.com/afzali/tarjomai/discussions)

---

**Made with ❤️ for the Persian-speaking community**

If this project helped you, give it a ⭐!
