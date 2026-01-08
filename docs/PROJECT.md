# ترجمای (Tarjomai)

## ابزار ترجمه و مقایسه هوشمند متون

> یک محیط کاملاً مرورگرمحور برای تحلیل سبک نگارش، مقایسه ترجمه چند مدل زبانی، و ترجمه دقیق متون بلند (مانند کتاب) با کنترل کامل انسانی، بدون ذخیره‌سازی سمت سرور و با تمرکز بر خوانایی و مقایسه جمله‌به‌جمله.

---

## 1. مشخصات فنی (Tech Stack)

| لایه | تکنولوژی |
|------|----------|
| **Framework** | SvelteKit |
| **UI Components** | ShadCN UI (Svelte) |
| **Styling** | TailwindCSS |
| **LLM Gateway** | OpenRouter API |
| **Storage** | IndexedDB (Dexie.js) |
| **Format** | Markdown Only |

---

## 2. اصول معماری و قوانین پایه

### 2.1 اصل Browser-Only

```
┌─────────────────────────────────────────────────────────┐
│                      مرورگر کاربر                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  SvelteKit  │  │  IndexedDB  │  │  OpenRouter API │  │
│  │     App     │◄─┤   Storage   │  │    (External)   │  │
│  └──────┬──────┘  └─────────────┘  └────────▲────────┘  │
│         │                                    │          │
│         └────────────────────────────────────┘          │
│                   Direct API Calls                      │
└─────────────────────────────────────────────────────────┘
```

**قوانین:**
- ✅ تمام کد در مرورگر اجرا می‌شود
- ✅ هیچ Backend اختصاصی وجود ندارد
- ✅ API calls مستقیماً از مرورگر به OpenRouter ارسال می‌شود
- ❌ هیچ داده‌ای به سرور خودمان ارسال نمی‌شود

### 2.2 اصل Offline-First

**ذخیره‌سازی در IndexedDB:**
- پروژه‌ها و متادیتا
- متون اصلی و ترجمه‌شده
- قوانین ترجمه (Translation Rules)
- تنظیمات کاربر
- تاریخچه ترجمه‌ها
- Presets و Templates

**قابلیت‌های مدیریت داده:**
- Export کامل پروژه (JSON)
- Import پروژه
- حذف کامل داده‌ها (Data Wipe)
- Export/Import قوانین ترجمه

### 2.3 اصل امنیت

| موضوع | قانون |
|-------|--------|
| API Key | فقط در مرورگر (localStorage/IndexedDB) ذخیره می‌شود |
| انتقال داده | فقط به OpenRouter و با HTTPS |
| حذف داده | کاربر می‌تواند همه‌چیز را پاک کند |
| رمزنگاری | API Key می‌تواند رمزنگاری شود (اختیاری) |

### 2.4 اصل فرمت متن

```
فقط Markdown
```

**دلایل:**
- سادگی پردازش
- امنیت (جلوگیری از XSS)
- یکدستی در نمایش
- سازگاری با LLM ها

**پشتیبانی نمی‌شود:**
- ❌ HTML خام
- ❌ Rich Text
- ❌ فرمت‌های اختصاصی

---

## 3. ساختار داده‌ای

### 3.1 مدل پروژه (Project)

```javascript
// Project
{
  id: String,
  title: String,
  description: String,           // اختیاری
  createdAt: Date,
  updatedAt: Date,
  
  // تنظیمات زبان
  sourceLanguage: String,
  targetLanguage: String,
  
  // مدل پیش‌فرض
  defaultModel: String,
  
  // قوانین ترجمه
  translationRules: TranslationRulesProfile,
  
  // ساختار محتوا
  chapters: [Chapter],
  
  // تنظیمات نمایش
  displaySettings: DisplaySettings
}
```

### 3.2 مدل قوانین ترجمه (Translation Rules Profile)

```javascript
// TranslationRulesProfile
{
  id: String,
  name: String,
  
  // ویژگی‌های سبک
  tone: [String],             // رسمی، ادبی، علمی، محاوره‌ای
  sentenceStructure: String,  // ساختار جمله
  vocabularyLevel: String,    // سطح واژگان
  fidelity: String,           // وفاداری به متن: 'low' | 'medium' | 'high' | 'literal'
  translationType: String,    // 'literal' | 'free' | 'balanced'
  
  // قوانین سفارشی
  customRules: [CustomRule],
  
  // پرامپت نهایی
  systemPrompt: String,
  
  // متادیتا
  createdAt: Date,
  isPreset: Boolean
}
```

### 3.3 مدل فصل/بخش (Chapter)

```javascript
// Chapter
{
  id: String,
  title: String,
  order: Number,
  
  // محتوا
  sourceText: String,         // متن اصلی (Markdown)
  translatedText: String,     // متن ترجمه‌شده
  
  // Override تنظیمات
  modelOverride: String,      // اختیاری
  rulesOverride: Object,      // اختیاری - بخشی از TranslationRulesProfile
  
  // وضعیت
  status: String,             // 'pending' | 'translating' | 'completed' | 'error'
  
  // زیرفصل‌ها
  sections: [Section]
}
```

### 3.4 مدل تنظیمات عمومی (Global Settings)

```javascript
// GlobalSettings
{
  // OpenRouter
  openRouterApiKey: String,
  
  // زبان رابط کاربری
  uiLanguage: String,         // 'fa' | 'en'
  
  // مدل‌های پیش‌فرض
  defaultModels: {
    styleAnalysis: String,
    translation: String,
    scoring: String
  },
  
  // تنظیمات نمایش
  defaultSourceLanguage: String,
  defaultTargetLanguage: String,
  textDirection: String       // 'rtl' | 'ltr' | 'auto'
}
```

---

## 4. ماژول‌های اصلی سیستم

### 4.1 ماژول تنظیمات (Settings Module)

**مسئولیت‌ها:**
- مدیریت OpenRouter API Key
- تنظیمات زبان و نمایش
- مدیریت مدل‌های پیش‌فرض
- Import/Export تنظیمات

**Blocking Behavior:**
- اگر API Key تنظیم نشده باشد، Modal بلاک‌کننده نمایش داده می‌شود
- تا تکمیل تنظیمات اولیه، دسترسی به سایر بخش‌ها ممکن نیست

### 4.2 ماژول پروژه (Project Module)

**مسئولیت‌ها:**
- ایجاد/ویرایش/حذف پروژه
- مدیریت ساختار فصل‌ها
- ذخیره و بازیابی از IndexedDB

**انواع شروع پروژه:**

| نوع | توضیح |
|-----|--------|
| **Guided Setup** | تحلیل سبک → مقایسه → انتخاب مدل → ترجمه |
| **Quick Setup** | تنظیم دستی قوانین → انتخاب مدل → ترجمه مستقیم |

### 4.3 ماژول تحلیل سبک (Style Analysis Module)

**ورودی:**
- یک یا چند نمونه متن (حدود ۱ صفحه)

**خروجی:**
- فرم ساخت‌یافته قابل ویرایش
- Translation Rules Profile

**قابلیت‌های تحلیل:**
- لحن (Tone)
- ساختار جمله
- سطح واژگان
- وفاداری به متن
- نوع ترجمه (آزاد/تحت‌اللفظی)

### 4.4 ماژول مقایسه (Comparison Module)

**ورودی:**
- متن نمونه
- قوانین ترجمه تأییدشده
- لیست مدل‌های انتخابی

**خروجی:**
- نمایش مقایسه‌ای چند ستونه
- امتیازدهی انسانی
- امتیازدهی AI (اختیاری)

**ویژگی‌های نمایش:**
- Sentence-aligned view
- Hover highlighting
- جمع‌بندی امتیازات

### 4.5 ماژول ترجمه (Translation Module)

**قابلیت‌ها:**
- ترجمه کل پروژه
- ترجمه بخش خاص
- ترجمه جمله خاص
- بازترجمه

**Override در سطح بخش:**
- تغییر مدل
- تغییر قوانین ترجمه
- ذخیره به‌عنوان پیش‌فرض جدید

### 4.6 ماژول قوانین ترجمه (Rules Module)

**قابلیت‌ها:**
- ویرایش قوانین
- ذخیره Preset
- Import/Export (JSON)
- Merge قوانین

---

## 5. قوانین تعامل با OpenRouter

### 5.1 ساختار درخواست

```javascript
// OpenRouterRequest
{
  model: String,
  messages: [Message],
  temperature: Number,        // اختیاری
  max_tokens: Number          // اختیاری
}
```

### 5.2 مدیریت خطا

| کد خطا | اقدام |
|--------|--------|
| 401 | نمایش خطای API Key نامعتبر |
| 429 | نمایش محدودیت نرخ، پیشنهاد صبر |
| 500+ | Retry با backoff |
| Network | نمایش خطای اتصال |

### 5.3 بهینه‌سازی

- Batch requests برای ترجمه‌های موازی
- Caching نتایج در IndexedDB
- Progress tracking برای عملیات طولانی

---

## 6. قوانین UI/UX

### 6.1 اصول طراحی

- **مینیمال:** بدون شلوغی بصری
- **خوانایی:** تمرکز بر متن
- **مقایسه واضح:** تفاوت‌ها قابل تشخیص باشند
- **RTL-First:** پشتیبانی کامل از راست‌به‌چپ

### 6.2 کامپوننت‌های اصلی

| کامپوننت | کاربرد |
|----------|--------|
| Dialog/Modal | تنظیمات، تأییدیه‌ها |
| Tabs | جابجایی بین نماها |
| Split Panel | نمایش متن اصلی/ترجمه |
| Sidebar | فهرست فصل‌ها |
| Form | ویرایش قوانین |
| Toast | اعلان‌ها |

### 6.3 جهت متن

```
زبان فارسی/عربی → RTL
زبان انگلیسی/... → LTR
حالت Auto → تشخیص خودکار بر اساس زبان
```

---

## 7. محدودیت‌ها و ملاحظات

### 7.1 محدودیت‌های فنی

- حجم IndexedDB محدود به مرورگر است
- API Key در مرورگر قابل مشاهده است (DevTools)
- عملکرد وابسته به سرعت اینترنت برای API calls

### 7.2 ملاحظات امنیتی

- API Key نباید در URL قرار گیرد
- استفاده از HTTPS الزامی است
- Sanitize کردن ورودی‌های Markdown

### 7.3 ملاحظات UX

- نمایش وضعیت بارگذاری
- امکان لغو عملیات طولانی
- ذخیره خودکار تغییرات
- تأییدیه قبل از حذف

---

## 8. نسخه‌بندی و توسعه آینده

### نسخه 1.0 (MVP)

- [x] تنظیمات OpenRouter
- [x] ایجاد پروژه
- [x] تحلیل سبک
- [x] مقایسه مدل‌ها
- [x] ترجمه اصلی
- [x] Export/Import

### نسخه‌های آینده (Roadmap)

- [ ] پشتیبانی از API های دیگر (Anthropic, OpenAI مستقیم)
- [ ] همکاری چند کاربره (با sync خارجی)
- [ ] افزونه مرورگر
- [ ] PWA با قابلیت آفلاین کامل
- [ ] تم‌های سفارشی

---

## 9. واژه‌نامه

| اصطلاح | توضیح |
|--------|--------|
| **Translation Rules Profile** | مجموعه قوانین و تنظیمات سبک ترجمه |
| **Preset** | قالب از پیش‌تعریف‌شده قوانین |
| **Override** | بازنویسی تنظیمات پیش‌فرض برای بخش خاص |
| **Sentence-aligned** | هم‌ردیف‌سازی جمله‌به‌جمله متن اصلی و ترجمه |
| **Guided Setup** | مسیر کامل با تحلیل و مقایسه |
| **Quick Setup** | مسیر سریع بدون تحلیل AI |

---

*آخرین بروزرسانی: ژانویه ۲۰۲۶*
