# وظایف پروژه ترجمای (Tarjomai)

> این فایل شامل لیست وظایف و زیروظایف پروژه است که بر اساس مستندات PROJECT.md و USER-JOURNEY.md تنظیم شده است.

**راهنما:**
- [ ] وظیفه انجام نشده
- [x] وظیفه انجام شده

---

## فاز ۰: آماده‌سازی پروژه 

### ۰.۱ پاکسازی و تنظیم اولیه
- [x] جابجایی همه صفحات در پوشه ایی بنام (archive) routes
- [x] ایجاد ساختار پوشه‌بندی جدید برای routes
- [x] بروزرسانی README.md برای پروژه ترجمای
- [x] ایجاد فایل .env.example برای متغیرهای محیطی

### ۰.۲ نصب وابستگی‌ها
- [x] نصب Dexie.js برای IndexedDB
- [x] نصب کتابخانه Markdown parser (marked)

---

## فاز ۱: لایه داده (Data Layer) 

### ۱.۱ طراحی دیتابیس IndexedDB
- [x] ایجاد فایل `src/lib/db/index.js` - تنظیمات Dexie
- [x] تعریف schema برای جدول `settings` (تنظیمات عمومی)
- [x] تعریف schema برای جدول `projects` (پروژه‌ها)
- [x] تعریف schema برای جدول `chapters` (فصل‌ها)
- [x] تعریف schema برای جدول `translationRules` (قوانین ترجمه)
- [x] تعریف schema برای جدول `presets` (پیش‌تنظیم‌ها)

### ۱.۲ سرویس‌های داده
- [x] ایجاد `src/lib/services/settings.service.js`
- [x] ایجاد `src/lib/services/projects.service.js`
- [x] ایجاد `src/lib/services/chapters.service.js`
- [x] ایجاد `src/lib/services/rules.service.js`

---

## فاز ۲: سرویس OpenRouter

### ۲.۱ کلاینت API
- [x] ایجاد `src/lib/services/openrouter.service.js`

---

## فاز ۳: Stores (State Management)

### ۳.۱ ایجاد Stores
- [x] ایجاد `src/lib/stores/settings.store.js`
- [x] ایجاد `src/lib/stores/projects.store.js`
- [x] ایجاد `src/lib/stores/currentProject.store.js`
- [x] ایجاد `src/lib/stores/ui.store.js`

---

## فاز ۴: صفحات اصلی (Routes)

### ۴.۱ Layout و صفحات پایه
- [x] ویرایش `src/routes/+layout.svelte`
- [x] ایجاد `src/routes/(app)/+page.svelte` - داشبورد
- [x] ایجاد `src/routes/(app)/settings/+page.svelte`
- [x] ایجاد `src/routes/(app)/projects/new/+page.svelte`

### ۴.۲ صفحات پروژه
- [x] ایجاد `src/routes/(app)/projects/[id]/+page.svelte` - Workspace
- [x] ایجاد `src/routes/(app)/projects/[id]/analyze/+page.svelte`
- [x] ایجاد `src/routes/(app)/projects/[id]/compare/+page.svelte`
- [x] ایجاد `src/routes/(app)/projects/[id]/select-model/+page.svelte`
- [x] ایجاد `src/routes/(app)/projects/[id]/quick-setup/+page.svelte`
- [x] ایجاد `src/routes/(app)/projects/[id]/rules/+page.svelte`

---

## فاز ۵: کامپوننت‌های سفارشی

### ۵.۱ کامپوننت‌های اصلی
- [x] ایجاد `src/lib/components/tarjomai/onboarding-modal.svelte`
- [ ] ایجاد `src/lib/components/tarjomai/project-card.svelte`
- [ ] ایجاد `src/lib/components/tarjomai/rules-form.svelte`
- [ ] ایجاد `src/lib/components/tarjomai/comparison-view.svelte`
- [ ] ایجاد `src/lib/components/tarjomai/chapter-sidebar.svelte`
- [ ] ایجاد `src/lib/components/tarjomai/sentence-aligned-view.svelte`
- [ ] ایجاد `src/lib/components/tarjomai/model-selector.svelte`

---

## فاز ۶: ابزارهای کمکی (Utilities)

- [x] ایجاد `src/lib/utils/text.utils.js`
- [x] ایجاد `src/lib/utils/markdown.utils.js`
- [x] ایجاد `src/lib/utils/export.utils.js`

---

## فاز ۷: پرامپت‌های AI

- [x] ایجاد `src/lib/prompts/style-analysis.prompt.js`
- [x] ایجاد `src/lib/prompts/translation.prompt.js`
- [x] ایجاد `src/lib/prompts/scoring.prompt.js`

---

*آخرین بروزرسانی: ژانویه ۲۰۲۶*