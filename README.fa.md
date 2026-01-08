# 🎨 قالب مدیریتی فارسی - shadcn-svelte RTL

> قالب کامل و حرفه‌ای مدیریتی با پشتیبانی کامل RTL برای زبان فارسی

[![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=flat&logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

## ✨ ویژگی‌ها

- 🎯 **54 کامپوننت RTL** - تمام کامپوننت‌های shadcn-svelte با پشتیبانی کامل RTL
- 📦 **30+ صفحه آماده** - Login, Signup, OTP, Dashboard, Sidebar
- 🔤 **فونت فارسی Vazirmatn** - از Google Fonts
- 🔄 **قابل بروزرسانی** - با یک دستور
- 🎨 **طراحی مدرن** - با Tailwind CSS v4
- 🌙 **Dark Mode** - پشتیبانی کامل از حالت تاریک
- ⚡ **سریع و بهینه** - SSR-ready
- 🛠️ **قابل سفارشی‌سازی** - تم‌ها و رنگ‌ها

## 📦 محتویات

### صفحات احراز هویت (15 صفحه)

#### 🔐 صفحات ورود (5 نمونه)
- `/login-01` - ساده و تمیز
- `/login-02` - با تصویر کناری
- `/login-03` - با پس‌زمینه
- `/login-04` - تمام صفحه
- `/login-05` - مینیمال

#### ✍️ صفحات ثبت‌نام (5 نمونه)
- `/signup-01` - ساده و تمیز
- `/signup-02` - با تصویر کناری
- `/signup-03` - با پس‌زمینه
- `/signup-04` - تمام صفحه
- `/signup-05` - مینیمال

#### 🔢 صفحات OTP (5 نمونه)
- `/otp-01` - ساده و تمیز
- `/otp-02` - با تصویر کناری
- `/otp-03` - با پس‌زمینه
- `/otp-04` - تمام صفحه
- `/otp-05` - مینیمال

### داشبورد و منو (17 صفحه)

- `/dashboard-01` - داشبورد کامل با نمودار و جدول
- `/sidebar-01` تا `/sidebar-16` - 16 نمونه مختلف منوی کناری

### دمو

- `/rtl-demo` - نمایش تمام 54 کامپوننت RTL

## 🚀 نصب و راه‌اندازی

### پیش‌نیازها

- Node.js 18+ 
- npm یا pnpm

### نصب

```bash
# کلون کردن پروژه
git clone <repository-url>
cd shadcn

# نصب وابستگی‌ها
npm install

# اجرای پروژه
npm run dev
```

پروژه در آدرس `http://localhost:5173` اجرا می‌شود.

## 📚 استفاده

### استفاده از کامپوننت‌های RTL

```svelte
<script>
  import { Button } from "$lib/components/ui-rtl/button";
  import { Card } from "$lib/components/ui-rtl/card";
</script>

<Card>
  <Button>دکمه فارسی</Button>
</Card>
```

### استفاده از RTL Provider

```svelte
<script>
  import RtlProvider from "$lib/components/rtl-provider.svelte";
</script>

<RtlProvider rtl={true} lang="fa">
  <!-- محتوای شما -->
</RtlProvider>
```

## 🔧 دستورات

```bash
# اجرای development server
npm run dev

# ساخت برای production
npm run build

# پیش‌نمایش build
npm run preview

# چک کردن TypeScript
npm run check

# تولید کامپوننت‌های RTL
npm run rtl:generate

# بروزرسانی shadcn + تولید RTL
npm run rtl:update
```

## 📖 ساختار پروژه

```
shadcn/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/           # کامپوننت‌های اصلی shadcn
│   │   │   └── ui-rtl/       # کامپوننت‌های RTL (تولید شده)
│   │   ├── rtl-utils.js      # توابع کمکی RTL
│   │   └── rtl-context.svelte.js
│   ├── routes/
│   │   ├── login-01/         # صفحات ورود
│   │   ├── signup-01/        # صفحات ثبت‌نام
│   │   ├── otp-01/           # صفحات OTP
│   │   ├── dashboard-01/     # داشبورد
│   │   └── sidebar-01/       # نمونه‌های sidebar
│   └── app.css               # استایل‌های اصلی + فونت
├── scripts/
│   └── generate-rtl-components.js  # اسکریپت تولید RTL
└── static/
    └── placeholder.svg       # تصویر نمونه
```

## 🎨 سفارشی‌سازی

### تغییر فونت

فونت در `src/app.html` و `src/app.css` تعریف شده است:

```css
/* src/app.css */
body {
  font-family: 'Vazirmatn', system-ui, sans-serif;
}
```

### تغییر تم

رنگ‌ها در `src/app.css` با CSS variables تعریف شده‌اند:

```css
:root {
  --primary: oklch(0.208 0.042 265.755);
  --background: oklch(1 0 0);
  /* ... */
}
```

## 🔄 بروزرسانی

### بروزرسانی shadcn-svelte

```bash
# روش 1: بروزرسانی خودکار
npm run rtl:update

# روش 2: دستی
npx shadcn-svelte@latest update
npm run rtl:generate
```

## 📝 کامپوننت‌های RTL

تمام 54 کامپوننت shadcn-svelte با پشتیبانی RTL:

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

## 🌐 پشتیبانی از زبان‌ها

- ✅ فارسی (Persian)
- ✅ عربی (Arabic)
- ✅ عبری (Hebrew)
- ✅ انگلیسی (English)

## 🤝 مشارکت

این پروژه open source است. برای مشارکت:

1. Fork کنید
2. یک branch جدید بسازید
3. تغییرات خود را commit کنید
4. Push کنید
5. Pull Request بفرستید

## 📄 لایسنس

MIT License - مشابه shadcn-svelte

## 🙏 تشکر

- [shadcn-svelte](https://shadcn-svelte.com) - کامپوننت‌های اصلی
- [SvelteKit](https://kit.svelte.dev) - فریمورک
- [Tailwind CSS](https://tailwindcss.com) - استایل
- [Vazirmatn](https://github.com/rastikerdar/vazirmatn) - فونت فارسی

## 📞 پشتیبانی

- 📖 [مستندات کامل](./RTL_DOCS.md)
- 🐛 [گزارش مشکل](https://github.com/...)
- 💬 [بحث و گفتگو](https://github.com/...)

---

**ساخته شده با ❤️ برای جامعه فارسی‌زبان**

اگر این پروژه برایتان مفید بود، ⭐ بدهید!
