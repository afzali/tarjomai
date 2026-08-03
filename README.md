

# 🌐 Tarjomai (ویرای)

A privacy-first, browser-only AI text processing platform for translation, editorial review, and style analysis. Designed with a strong focus on Persian/Arabic RTL workflows, offline capabilities, and direct multi-LLM integration via OpenRouter.

## ✨ Key Features
- 🌐 **Browser-Only & Privacy-First** — Runs entirely client-side. No data is ever sent to a backend server.
- 💾 **Offline-First Storage** — Projects, settings, and translations are stored locally using IndexedDB (Dexie.js).
- 🤖 **Multi-LLM Support** — Connects directly to OpenRouter to leverage multiple AI models.
- 📊 **Model Comparison** — Compare translations from different models side-by-side with real-time progress tracking.
- ⏹️ **Per-Model Cancellation** — Cancel individual model requests without interrupting others.
- 📝 **AI Style Analysis** — Analyze writing tone, structure, and vocabulary to generate custom translation rules.
- ✏️ **Smart Editorial Workspace** — AI-assisted editing with semantic diff highlighting, drift detection, and per-change revert.
- 🎨 **Full RTL Support** — Native right-to-left layout with an automated system for generating RTL-ready UI components.
- 📦 **Project Backup** — Export and import entire projects as JSON for seamless migration or backup.
- 🌍 **Custom Languages** — Add and manage custom language codes across all projects.

## 🛠 Tech Stack
- **Framework:** SvelteKit & Svelte 5
- **UI Components:** shadcn-svelte
- **Styling:** Tailwind CSS v4
- **Database:** Dexie.js (IndexedDB wrapper)
- **LLM Gateway:** OpenRouter API
- **Font:** Vazirmatn (optimized for Persian/Arabic)

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+
- npm or pnpm

### Quick Start
```bash
git clone https://github.com/afzali/tarjomai.git
cd tarjomai
npm install
npm run dev
```
The app will run at `http://localhost:5173`.

## 💻 Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server with hot module reloading |
| `npm run build` | Build the app for production |
| `npm run preview` | Preview the production build locally |
| `npm run check` | Run type checking with `svelte-check` |
| `npm run rtl:generate` | Generate/refresh RTL variants of UI components |
| `npm run rtl:update` | Update shadcn-svelte components and regenerate RTL variants |

## 🎨 RTL & UI System
Tarjomai includes an automated pipeline (`scripts/generate-rtl-components.js`) that transforms standard `shadcn-svelte` components into RTL-ready variants. This handles directional class swaps (`pl` ↔ `pr`, `mr` ↔ `ml`, etc.), icon direction flips, and layout adjustments automatically. 

To use RTL components in your views:
```svelte
<script>
  import RtlProvider from "$lib/components/rtl-provider.svelte";
  import { Button } from "$lib/components/ui-rtl/button";
</script>

<RtlProvider rtl={true} lang="fa">
  <Button>دکمه فارسی</Button>
</RtlProvider>
```

## 📄 License
This project is licensed under the MIT License.

## 🙏 Credits
- [shadcn-svelte](https://shadcn-svelte.com)
- [SvelteKit](https://kit.svelte.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Dexie.js](https://dexie.org)
- [Vazirmatn Font](https://github.com/rastikerdar/vazirmatn)
