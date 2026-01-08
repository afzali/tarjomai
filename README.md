# 🎨 Persian Admin Template - shadcn-svelte RTL

> Complete and professional admin template with full RTL support for Persian/Farsi language

[![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=flat&logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[فارسی](./README.fa.md) | English

## ✨ Features

- 🎯 **54 RTL Components** - All shadcn-svelte components with full RTL support
- 📦 **30+ Ready Pages** - Login, Signup, OTP, Dashboard, Sidebar
- 🔤 **Vazirmatn Persian Font** - From Google Fonts
- 🔄 **Auto-Updatable** - Update with one command
- 🎨 **Modern Design** - With Tailwind CSS v4
- 🌙 **Dark Mode** - Full dark mode support
- ⚡ **Fast & Optimized** - SSR-ready
- 🛠️ **Customizable** - Themes and colors

## 📦 Contents

### Authentication Pages (15 pages)

- **Login Pages** (5 variants): `/login-01` to `/login-05`
- **Signup Pages** (5 variants): `/signup-01` to `/signup-05`
- **OTP Pages** (5 variants): `/otp-01` to `/otp-05`

### Dashboard & Sidebar (17 pages)

- **Dashboard**: `/dashboard-01` - Complete dashboard with charts and tables
- **Sidebar Examples**: `/sidebar-01` to `/sidebar-16` - 16 different sidebar layouts

### Demo

- `/rtl-demo` - Showcase of all 54 RTL components

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the project
git clone <repository-url>
cd shadcn

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
shadcn/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/           # Original shadcn components
│   │   │   └── ui-rtl/       # RTL components (generated)
│   │   ├── rtl-utils.js      # RTL utility functions
│   │   └── rtl-context.svelte.js
│   ├── routes/
│   │   ├── login-01/         # Login pages
│   │   ├── signup-01/        # Signup pages
│   │   ├── otp-01/           # OTP pages
│   │   ├── dashboard-01/     # Dashboard
│   │   └── sidebar-01/       # Sidebar examples
│   └── app.css               # Main styles + font
├── scripts/
│   └── generate-rtl-components.js  # RTL generation script
└── static/
    └── placeholder.svg       # Placeholder image
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

- 📖 [Full Documentation](./RTL_DOCS.md)
- 🐛 [Report Issues](https://github.com/...)
- 💬 [Discussions](https://github.com/...)

---

**Made with ❤️ for the Persian-speaking community**

If this project helped you, give it a ⭐!
