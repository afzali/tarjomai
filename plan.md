# Tarjomai — بازطراحی پلتفرم چندعملیاتی

## Context
ترجمای فعلاً فقط ترجمه می‌کند. هدف تبدیل آن به پلتفرمی است که انواع مختلف عملیات متنی را از طریق AI انجام دهد. اولین عملیات جدید: ویراستاری (Editorial). تغییرات شامل بازطراحی دیتابیس، داشبورد، سیستم export، و افزودن محیط ویراستاری کامل است.

---

## وضعیت فعلی (مرور سریع)

- **فریمورک:** SvelteKit v2 + Svelte 5 + TailwindCSS v4
- **ذخیره‌سازی:** Dexie (IndexedDB) — version 4
- **جداول فعلی:** settings, projects, chapters, translationRules, presets, usageHistory, reviewMessages
- **AI:** OpenRouter API — سرویس در `src/lib/services/openrouter.service.js`
- **فیلد خروجی فصل:** `chapters.translatedText`
- **صفحه کارپایه:** `src/routes/(app)/projects/[id]/+page.svelte` (~1100 خط)
- **Export:** JSON + DOCX (inline در صفحه) + Markdown/TXT

---

## بخش اول: زیرساخت مشترک

### فاز 1 — مهاجرت دیتابیس (Schema v5 + v6)

**فایل:** `src/lib/db/index.js`

**تغییرات v5:**
```
projects: ++id, title, createdAt, updatedAt, setupStep, operationType, folderId
chapters: ++id, projectId, order, status  (داده‌ها: outputText جایگزین translatedText)
operationConfig: ++id, projectId, operationType, name, isPreset  (جدید)
presets: ++id, name, createdAt, operationType
folders: ++id, name, parentId, createdAt, updatedAt  (جدید)
translationRules: همان — برای دسترسی در upgrade transaction
```

**upgrade v5:**
1. همه `projects` را با `operationType: 'translation'` آپدیت کن
2. تمام `translationRules` را به `operationConfig` کپی کن (با `operationType: 'translation'`)
3. در همه `chapters`: `translatedText` → `outputText`، اضافه کردن `segmentData: null`

**v6:** `translationRules: null` (حذف جدول قدیمی)

**شکل جدید Segment (برای editorial):**
```js
{
  index: number,
  sourceText: string,
  outputText: string,
  status: 'pending' | 'accepted' | 'rejected' | 'edited',
  editedText: string | null
}
```

**شکل operationConfig برای translation:** همان مقادیر قدیمی translationRules + فیلد `operationType: 'translation'`

**شکل operationConfig برای editorial:**
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

---

### فاز 2 — لایه سرویس

#### 2.1 ایجاد `src/lib/services/operationConfig.service.js` (جایگزین rules.service.js)
- `getConfig(projectId)` — دریافت config پروژه
- `saveConfig(projectId, data)` — upsert
- `getDefaultTranslationConfig()` — مقادیر پیش‌فرض ترجمه
- `getDefaultEditorialConfig()` — مقادیر پیش‌فرض ویراستاری
- `buildEditorialPrompt(options, targetLanguage)` — ساخت prompt خودکار از تنظیمات

#### 2.2 `src/lib/services/rules.service.js`
تبدیل به shim که `operationConfigService` را re-export کند (جلوگیری از شکستن wizard pages)

#### 2.3 `src/lib/services/chapters.service.js`
- تغییر `translatedText` → `outputText` در تمام متدها
- `updateTranslation(id, text)` → `updateOutput(id, text)` (با alias برای backward-compat)
- پشتیبانی از `segmentData` در create/update

#### 2.4 `src/lib/services/projects.service.js`
- `createProject` → اضافه کردن `operationType`, `folderId: null`
- `deleteProject` → حذف از `operationConfig` به جای `translationRules`
- `importProject` / `exportProject` → استفاده از `operationConfig`
- اضافه کردن `moveToFolder(projectId, folderId)`
- به‌روزرسانی `getNextSetupStep` برای editorial route

#### 2.5 ایجاد `src/lib/services/folders.service.js`
- `getAllFolders()`, `createFolder(name, parentId)`, `updateFolder(id, data)`, `deleteFolder(id)`
- هنگام حذف folder: همه پروژه‌های داخل آن به root برگردند (`folderId: null`)

#### 2.6 `src/lib/stores/currentProject.store.js`
- `rules` → `config`، استفاده از `operationConfigService`
- `saveRules()` → `saveConfig()` (با alias)

#### 2.7 `src/lib/stores/models.store.js`
- تبدیل به Svelte writable store (به جای توابع ساده)
- کش در حافظه با TTL 10 دقیقه
- همه wizard pages و rules page از یک store استفاده کنند

#### 2.8 `src/lib/utils/export.utils.js`
- استفاده از `outputText` به جای `translatedText`
- افزودن `exportLabel` parameter (ترجمه / ویرایش‌شده)
- `exportEditorialToWord`: محاسبه خروجی نهایی از `segmentData`

#### 2.9 `src/lib/services/settings.service.js`
- `clearAllData` → پاکسازی `operationConfig` و `folders` هم

---

### فاز 3 — رجیستری عملیات

**ایجاد `src/lib/operations/index.js`:**
```js
export const OPERATIONS = {
  translation: {
    id: 'translation', label: 'ترجمه', icon: 'languages',
    wizardEntry: (id) => `/projects/${id}/analyze` or `/projects/${id}/quick-setup`,
    workspaceRoute: (id) => `/projects/${id}`
  },
  editorial: {
    id: 'editorial', label: 'ویرایش', icon: 'pencil-line',
    wizardEntry: (id) => `/projects/${id}/editorial-setup`,
    workspaceRoute: (id) => `/projects/${id}/editorial`
  }
}
```

---

### فاز 4 — بازطراحی داشبورد (فایل منیجر)

**اجزای جدید:**

| کامپوننت | مسیر |
|----------|------|
| `file-manager.svelte` | `src/lib/components/tarjomai/` |
| `folder-card.svelte` | `src/lib/components/tarjomai/` |
| `project-card.svelte` | `src/lib/components/tarjomai/` |
| `new-project-quick.svelte` | `src/lib/components/tarjomai/` |

**ساختار `file-manager.svelte`:**
- نوار ابزار: breadcrumb + مرتب‌سازی + دکمه پوشه جدید + دکمه پروژه جدید
- نمایش پوشه‌ها (در سطح جاری)
- نمایش پروژه‌ها (در سطح جاری / پوشه جاری)
- context menu روی پوشه: تغییر نام، حذف، رفتن به داخل
- context menu روی پروژه: باز کردن، انتقال به پوشه، حذف
- badge نوع عملیات روی هر کارت پروژه

**به‌روزرسانی `src/routes/(app)/+page.svelte`:**
تبدیل به container ساده که فقط `<FileManager />` را render کند.

---

### فاز 5 — جریان ایجاد پروژه جدید

**به‌روزرسانی `src/routes/(app)/projects/new/+page.svelte`:**

**مرحله 0 (جدید) — انتخاب نوع عملیات:**
```
┌─────────────────────┐  ┌─────────────────────┐
│  🌐  ترجمه          │  │  ✏️  ویرایش          │
│  ترجمه متن بین      │  │  ویرایش و تصحیح      │
│  زبان‌ها             │  │  متن                 │
└─────────────────────┘  └─────────────────────┘
```

- `translation` → فرم فعلی (زبان مبدا/مقصد، نوع راه‌اندازی)
- `editorial` → فرم مختصر (نام پروژه، زبان متن) → مستقیم به `editorial-setup`

---

### فاز 4.5 — Framework عمومی Wizard

**مشکل فعلی:** هر wizard page مستقل است — progress bar، header، navigation و save pattern همه inline و تکراری هستند.

**راه‌حل:** یک container component و یک تعریف declarative برای هر wizard.

#### کامپوننت جدید: `src/lib/components/tarjomai/wizard-shell.svelte`

یک wrapper عمومی که هر wizard داخلش قرار می‌گیرد:

```
┌──────────────────────────────────────────────────┐
│  [← برگشت]   عنوان Wizard         نوع عملیات     │
├──────────────────────────────────────────────────┤
│  ●─────●─────○─────○   ← StepBar                 │
│  مرحله ۱  مرحله ۲  ...                            │
├──────────────────────────────────────────────────┤
│                                                   │
│         {@render stepContent()}  ← slot           │
│                                                   │
├──────────────────────────────────────────────────┤
│  [← قبلی]                    [ادامه / تکمیل →]   │
└──────────────────────────────────────────────────┘
```

Props:
```js
{
  steps: WizardStep[],         // تعریف مراحل
  currentStep: number,         // مرحله جاری
  projectId: number,
  operationType: string,
  onNext: () => Promise<void>,
  onBack: () => void,
  onFinish: () => Promise<void>,
  saving: boolean
}
```

**تعریف `WizardStep`:**
```ts
interface WizardStep {
  id: string,              // 'setup', 'options', 'prompt-review'
  label: string,           // 'تنظیمات', 'گزینه‌ها', 'بررسی prompt'
  icon?: string,           // نام آیکون Lucide
  description?: string,
  canSkip?: boolean,
  validate?: () => boolean | string  // validation قبل از ادامه
}
```

#### فایل تعریف wizard هر عملیات

**`src/lib/operations/wizards/translation.wizard.js`:**
```js
export const translationWizard = {
  guided: [
    { id: 'analyze', label: 'تحلیل سبک', icon: 'sparkles' },
    { id: 'compare', label: 'مقایسه مدل‌ها', icon: 'git-compare' },
    { id: 'select-model', label: 'انتخاب مدل', icon: 'cpu' }
  ],
  quick: [
    { id: 'quick-setup', label: 'راه‌اندازی سریع', icon: 'zap' }
  ]
}
```

**`src/lib/operations/wizards/editorial.wizard.js`:**
```js
export const editorialWizard = {
  default: [
    { id: 'language', label: 'زبان متن', icon: 'globe' },
    { id: 'options', label: 'گزینه‌های ویرایش', icon: 'settings-2' },
    { id: 'prompt-review', label: 'بررسی دستورالعمل', icon: 'file-text' }
  ]
}
```

**هر wizard page (مثل `editorial-setup`)** از `WizardShell` استفاده می‌کند:
```svelte
<WizardShell steps={editorialWizard.default} {currentStep} {projectId}
  onNext={saveAndGoNext} onBack={goBack} onFinish={finish}>
  {#if currentStep === 0}
    <LanguageStep bind:language />
  {:else if currentStep === 1}
    <OptionsStep bind:options />
  {:else}
    <PromptReviewStep {generatedPrompt} bind:promptMode bind:customPrompt />
  {/if}
</WizardShell>
```

**صفحات wizard ترجمه** (analyze, compare, quick-setup) هم به تدریج به همین pattern مهاجرت می‌کنند.

---

### فاز 4.6 — سیستم نوع فایل (File Type System)

**ایده:** هر پروژه یک "نوع فایل" است — مثل سیستم‌عامل که `.docx` با Word باز می‌شود و `.psd` با Photoshop. کاربر با یک نگاه می‌فهمد هر پروژه چیست و می‌تواند فیلتر کند.

#### تعریف انواع فایل

**فایل:** `src/lib/operations/fileTypes.js`

```js
export const FILE_TYPES = {
  translation: {
    id: 'translation',
    extension: '.trj',         // ترجمه → Tarjomai
    label: 'سند ترجمه',
    labelEn: 'Translation',
    icon: 'languages',
    color: 'blue',             // رنگ badge و آیکون
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    description: 'ترجمه متن از یک زبان به زبان دیگر با هوش مصنوعی'
  },
  editorial: {
    id: 'editorial',
    extension: '.vry',         // ویرایش → Virayesh
    label: 'سند ویرایش',
    labelEn: 'Editorial',
    icon: 'pencil-line',
    color: 'violet',
    bgColor: 'bg-violet-100',
    textColor: 'text-violet-700',
    borderColor: 'border-violet-200',
    description: 'ویرایش و تصحیح متن با هوش مصنوعی'
  }
  // آینده: glossary → .gls, summarize → .smr, ...
}

export function getFileType(operationType) {
  return FILE_TYPES[operationType] || FILE_TYPES.translation;
}
```

#### نمایش در داشبورد

هر کارت پروژه شامل:
```
┌────────────────────────────────────┐
│  [🌐] نام پروژه          [.trj] ← │  badge extension با رنگ نوع فایل
│  آخرین ویرایش: ۲ ساعت پیش          │
│  ۳ فصل · ۴۵٪ کامل                 │
└────────────────────────────────────┘
```

#### فیلتر و نمایش

نوار فیلتر بالای داشبورد (بعد از toolbar):
```
همه  |  [🌐 .trj ترجمه]  |  [✏️ .vry ویرایش]  |  📁 پوشه‌ها
```

- کلیک روی هر نوع: نمایش فقط همان نوع
- قابل ترکیب با جستجو و مرتب‌سازی
- badge رنگی روی هر کارت همیشه نوع را نشان می‌دهد

#### آیکون فایل (FileTypeIcon Component)

**`src/lib/components/tarjomai/file-type-icon.svelte`:**
```svelte
<!-- نمایش آیکون بزرگ با extension -->
<div class="file-icon {fileType.bgColor} {fileType.borderColor}">
  <Icon name={fileType.icon} />
  <span class="extension">{fileType.extension}</span>
</div>
```

در صفحه اصلی پروژه (header):
```
┌─────────────────────────────┐
│  [🌐]                       │
│  .trj                       │  ← آیکون بزرگ نوع فایل
│  نام پروژه                   │
│  انگلیسی → فارسی             │
└─────────────────────────────┘
```

---

## بخش دوم: ویراستاری (عملیات جدید)

### فاز 6 — Wizard ویراستاری

**صفحه جدید:** `src/routes/(app)/projects/[id]/editorial-setup/+page.svelte`

سه مرحله به صورت stepper:

**مرحله 1:** انتخاب زبان متن (همان کامپوننت language selector فعلی)

**مرحله 2:** گزینه‌های ویراستاری:
```
[✓] نرمال‌سازی یونیکد (بخصوص فارسی)
[ ] جایگزینی نیم‌فاصله با فاصله کامل
[✓] تصحیح غلط‌های املایی
[✓] پیشنهادات تصحیح دستوری
─────────────────────────
دستورات سفارشی:
[___________________________________]
```

**مرحله 3:** مرور prompt:
- نمایش prompt خودکار تولیدشده (از `buildEditorialPrompt`)
- toggle بین حالت Auto / Manual
- دکمه "شروع ویراستاری" → ذخیره config + redirect به `/projects/[id]/editorial`

---

### فاز 7 — محیط کاری ویراستاری

**صفحه جدید:** `src/routes/(app)/projects/[id]/editorial/+page.svelte`

**ساختار layout:**
```
┌─ Sidebar ──────────┬─ Main ──────────────────────────┐
│ لیست فصول          │ نوار ابزار بالا                  │
│ [فصل ۱]            │  [عنوان پروژه] [config] [خروجی]  │
│ [فصل ۲] ✓          ├─────────────────────────────────┤
│ ...                │ [اگر بدون segmentData]           │
│                    │  textarea + دکمه "ویرایش با AI"  │
│                    ├─────────────────────────────────┤
│                    │ [اگر با segmentData]             │
│                    │  SegmentReviewView               │
└────────────────────┴─────────────────────────────────┘
```

**کامپوننت جدید:** `src/lib/components/tarjomai/segment-review.svelte`

هر segment به این شکل:
```
┌──────────────────────────────────────────────────┐
│ متن اصلی:                                         │
│ پاراگراف اصلی اینجا...                            │
├──────────────────────────────────────────────────┤
│ پیشنهاد ویرایش:                        [✓] [✗]  │
│ پاراگراف ویرایش‌شده اینجا...                      │
│                               [✏️ ویرایش دستی]  │
└──────────────────────────────────────────────────┘
```

رنگ‌بندی وضعیت:
- `pending` → خاکستری
- `accepted` → سبز
- `rejected` → قرمز (خروجی = متن اصلی)
- `edited` → آبی (خروجی = متن ویرایش‌شده توسط کاربر)

**حلقه پردازش AI:**
1. تقسیم `sourceText` به پاراگراف‌ها (مثل ترجمه)
2. برای هر پاراگراف: ارسال به OpenRouter با prompt ویراستاری
3. ذخیره `segmentData` در `chapter` بعد از هر پاراگراف (پیشرفت تدریجی)
4. پشتیبانی از abort/cancel

**محاسبه خروجی نهایی:**
```js
function computeFinalOutput(segments) {
  return segments.map(s => {
    if (s.status === 'rejected') return s.sourceText;
    if (s.status === 'edited') return s.editedText;
    return s.outputText;
  }).join('\n\n');
}
```

---

### فاز 8 — پنل Review/Chat استخراج‌شده

**کامپوننت جدید:** `src/lib/components/tarjomai/review-panel.svelte`

Props:
```js
{ chapterId, projectId, operationType, sourceText, outputText, apiKey, defaultModel, onClose }
```

**ویژگی‌های جدید:**
- انتخاب متن در segment → دکمه شناور "چت درباره این متن" → quote خودکار در input
- پنل resizable با `paneforge` (از `ui-rtl/resizable`)
- layout: `ResizablePaneGroup vertical` بین محتوا و chat (70/30)

**به‌روزرسانی صفحه ترجمه:** جایگزینی کد inline review با `<ReviewPanel />`

---

## ترتیب اجرا

| مرحله | کار | اولویت |
|-------|-----|---------|
| 1 | مهاجرت Dexie (v5 + v6) + تست | ⭐ بحرانی |
| 2 | سرویس‌های جدید (`operationConfig`, `folders`, `chapters`) | ⭐ بحرانی |
| 3 | بررسی سلامت ترجمه (تست کامل) | ⭐ بحرانی |
| 4 | سیستم نوع فایل (`fileTypes.js` + `FileTypeIcon`) | بالا |
| 5 | رجیستری عملیات + `operations/index.js` + wizard definitions | بالا |
| 6 | `WizardShell` component (framework عمومی) | بالا |
| 7 | جریان پروژه جدید (انتخاب نوع عملیات) | بالا |
| 8 | بازطراحی داشبورد (فایل منیجر + فیلتر نوع فایل) | بالا |
| 9 | Wizard ویراستاری (با WizardShell) | بالا |
| 10 | محیط کاری ویراستاری + segment review | بالا |
| 11 | استخراج ReviewPanel + text-selection chat | متوسط |
| 12 | پنل‌های resizable | متوسط |
| 13 | مهاجرت wizard ترجمه به WizardShell (اختیاری — بعداً) | پایین |

---

## ریسک‌ها و راه‌حل‌ها

| ریسک | راه‌حل |
|------|---------|
| خرابی Dexie upgrade در داده قدیمی | upgrade را در try/catch بگذار؛ قبل از deploy تست کن |
| `translatedText` در کامپوننت‌ها | بعد از migration، grep کامل برای `translatedText` |
| شکستن wizard pages هنگام تغییر rules service | نگه داشتن `rules.service.js` به عنوان shim |
| `importProject` هنوز از `translationRules` استفاده می‌کند | آپدیت import/export برای هر دو فرمت قدیم و جدید |

---

## فایل‌های بحرانی برای تغییر

| فایل | نوع تغییر |
|------|-----------|
| `src/lib/db/index.js` | v5 schema + upgrade + v6 drop |
| `src/lib/services/chapters.service.js` | `outputText`، `segmentData` |
| `src/lib/services/projects.service.js` | `operationType`، `folderId`، `operationConfig` |
| `src/lib/stores/currentProject.store.js` | `config` به جای `rules` |
| `src/routes/(app)/+page.svelte` | بازطراحی به FileManager |
| `src/routes/(app)/projects/new/+page.svelte` | انتخاب نوع عملیات |
| `src/routes/(app)/projects/[id]/+page.svelte` | `outputText`، ReviewPanel |
| `src/lib/utils/export.utils.js` | `outputText`، unified API |

## فایل‌های جدید برای ایجاد

| فایل | هدف |
|------|-----|
| `src/lib/services/operationConfig.service.js` | جایگزین rules.service |
| `src/lib/services/folders.service.js` | مدیریت پوشه‌ها |
| `src/lib/operations/index.js` | رجیستری عملیات |
| `src/lib/operations/fileTypes.js` | تعریف انواع فایل (.trj، .vry و ...) |
| `src/lib/operations/wizards/translation.wizard.js` | تعریف مراحل wizard ترجمه |
| `src/lib/operations/wizards/editorial.wizard.js` | تعریف مراحل wizard ویراستاری |
| `src/lib/components/tarjomai/wizard-shell.svelte` | Container عمومی wizard |
| `src/lib/components/tarjomai/file-type-icon.svelte` | آیکون نوع فایل با extension |
| `src/lib/components/tarjomai/file-manager.svelte` | داشبورد جدید |
| `src/lib/components/tarjomai/folder-card.svelte` | کارت پوشه |
| `src/lib/components/tarjomai/project-card.svelte` | کارت پروژه با badge نوع فایل |
| `src/lib/components/tarjomai/review-panel.svelte` | پنل chat استخراج‌شده |
| `src/lib/components/tarjomai/segment-review.svelte` | رابط accept/reject ویراستاری |
| `src/routes/(app)/projects/[id]/editorial-setup/+page.svelte` | Wizard ویراستاری (با WizardShell) |
| `src/routes/(app)/projects/[id]/editorial/+page.svelte` | محیط کاری ویراستاری |

---

## تایید نهایی

بعد از اجرا، موارد زیر باید کار کنند:
1. پروژه‌های قدیمی ترجمه بدون از دست دادن داده لود شوند
2. ترجمه جدید با `outputText` کار کند
3. داشبورد badge `.trj` روی پروژه‌های ترجمه نشان دهد
4. فیلتر نوع فایل در داشبورد کار کند
5. پروژه جدید با انتخاب نوع عملیات ساخته شود
6. WizardShell در wizard ویراستاری نمایش درستی داشته باشد
7. wizard ویراستاری کامل شود و config ذخیره شود
8. AI هر پاراگراف را ویرایش کند و کاربر accept/reject کند
9. export Word/Markdown از هر دو نوع عملیات کار کند
10. پوشه‌ها در داشبورد ایجاد/حذف/انتقال شوند
11. chat روی متن انتخاب‌شده کار کند
