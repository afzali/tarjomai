/**
 * Prompts and helpers for the review side panel:
 *  - "بررسی کلی": a structured, chunked review of a whole chapter that returns
 *    machine-applicable fixes ({ original → suggested }) grouped by severity.
 *  - "گفتگو": the free-form chat, which now sees the whole chapter (numbered
 *    by paragraph), the project rules and the relevant glossary entries.
 *
 * The user can edit the *instructions* part of both prompts. The output
 * contract of the review (JSON shape + fix rules) is fixed, because one-click
 * fixing depends on it.
 */

/** Severity groups, most important first. */
export const REVIEW_CATEGORIES = [
  {
    key: 'critical',
    label: 'جدی و قطعی',
    hint: 'جاافتادگی، اشتباه محرز در معنا، افزوده‌ی نابجا، خطا در عدد و نام',
    dot: 'bg-red-500',
    text: 'text-red-700 dark:text-red-300',
    soft: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-900'
  },
  {
    key: 'error',
    label: 'اشتباهات ساده',
    hint: 'غلط املایی، دستوری، نگارشی و نشانه‌گذاری',
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
    soft: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-900'
  },
  {
    key: 'consistency',
    label: 'یکدستی و قوانین',
    hint: 'ناهماهنگی اصطلاحات، رعایت‌نشدن واژه‌نامه یا قوانین پروژه',
    dot: 'bg-violet-500',
    text: 'text-violet-700 dark:text-violet-300',
    soft: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-200 dark:border-violet-900'
  },
  {
    key: 'suggestion',
    label: 'پیشنهادها',
    hint: 'روان‌تر کردن، واژه‌گزینی بهتر، سبک',
    dot: 'bg-sky-500',
    text: 'text-sky-700 dark:text-sky-300',
    soft: 'bg-sky-50 dark:bg-sky-950/30',
    border: 'border-sky-200 dark:border-sky-900'
  }
];

/** @type {Record<string, { label: string, category: string }>} */
export const ISSUE_TYPES = {
  omission: { label: 'جاافتادگی', category: 'critical' },
  mistranslation: { label: 'اشتباه در معنا', category: 'critical' },
  addition: { label: 'افزوده‌ی نابجا', category: 'critical' },
  number: { label: 'عدد / نام', category: 'critical' },
  spelling: { label: 'املایی', category: 'error' },
  grammar: { label: 'دستوری', category: 'error' },
  punctuation: { label: 'نگارشی', category: 'error' },
  terminology: { label: 'اصطلاح', category: 'consistency' },
  glossary: { label: 'واژه‌نامه', category: 'consistency' },
  rule: { label: 'قوانین پروژه', category: 'consistency' },
  fluency: { label: 'روانی', category: 'suggestion' },
  style: { label: 'سبک', category: 'suggestion' },
  other: { label: 'سایر', category: 'suggestion' }
};

/** Characters (source + target) per review part. Smaller = more thorough. */
export const PART_SIZES = [
  { key: 'small', chars: 5000, label: 'کوچک', hint: 'دقیق‌ترین، درخواست بیشتر' },
  { key: 'medium', chars: 9000, label: 'متوسط', hint: 'پیشنهادی' },
  { key: 'large', chars: 16000, label: 'بزرگ', hint: 'سریع‌تر، ممکن است موارد کمتری پیدا کند' }
];

export const DEFAULT_REVIEW_INSTRUCTIONS = {
  translation: `تو یک ویراستار و بازبین ارشد ترجمه هستی. بندهای داده‌شده را یکی‌یکی با متن اصلی مقایسه کن و همه‌ی ایرادهای واقعی ترجمه را پیدا کن.
- اولویت اول وفاداری به معناست: هیچ جمله یا عبارتی نباید جا افتاده باشد، چیزی نباید اضافه شده باشد و معنا نباید عوض شده باشد.
- سپس درستی املایی، دستوری و نگارشی زبان مقصد را بررسی کن.
- یکدستی اصطلاحات در سراسر متن و رعایت واژه‌نامه و قوانین پروژه را بسنج.
- پیشنهاد سبکی را فقط وقتی بده که واقعاً متن را بهتر می‌کند؛ سلیقه‌ی شخصی را ایراد حساب نکن.
- سخت‌گیر ولی منصف باش: چیزی را که درست است ایراد نگیر.`,
  editorial: `تو یک ویراستار ارشد هستی. متن اصلی و نسخه‌ی ویرایش‌شده‌ی آن داده می‌شود. نسخه‌ی ویرایش‌شده را بند به بند بررسی کن:
- آیا در ویرایش معنا تغییر کرده یا بخشی از متن حذف شده است؟ (جدی)
- آیا غلط املایی، دستوری یا نگارشی باقی مانده یا تازه ایجاد شده است؟
- آیا رسم‌الخط، نیم‌فاصله‌ها و اصطلاحات در سراسر متن یکدست است و قوانین پروژه رعایت شده؟
- پیشنهاد سبکی را فقط وقتی بده که واقعاً متن را بهتر می‌کند.`
};

export const DEFAULT_CHAT_INSTRUCTIONS = {
  translation: `تو یک مترجم و ویراستار حرفه‌ای هستی و کنار کاربر روی ترجمه‌ی این فصل کار می‌کنی. به پرسش‌های کاربر درباره‌ی متن و ترجمه دقیق و کاربردی پاسخ بده.
وقتی اصلاحی پیشنهاد می‌کنی، شماره‌ی بند، متن فعلی و متن پیشنهادی را دقیق و جدا بنویس و دلیلش را کوتاه بگو.`,
  editorial: `تو یک ویراستار حرفه‌ای هستی و کنار کاربر روی ویرایش این فصل کار می‌کنی. به پرسش‌های کاربر درباره‌ی متن اصلی و نسخه‌ی ویرایش‌شده دقیق و کاربردی پاسخ بده.
وقتی اصلاحی پیشنهاد می‌کنی، شماره‌ی بند، متن فعلی و متن پیشنهادی را دقیق و جدا بنویس و دلیلش را کوتاه بگو.`
};

/**
 * @typedef {{ id: string, source: string, target: string }} ReviewUnit
 * @typedef {{
 *   operationType: 'translation'|'editorial',
 *   sourceLanguage?: string, targetLanguage?: string,
 *   rules?: string, glossarySection?: (text: string) => string,
 *   units: ReviewUnit[]
 * }} ReviewContext
 * @typedef {{
 *   chatInstructions?: string, reviewInstructions?: string,
 *   includeRules?: boolean, includeGlossary?: boolean,
 *   chatContext?: 'full'|'none', partSize?: string
 * }} PromptConfig
 */

/** @param {PromptConfig | null | undefined} cfg */
export function resolvePromptConfig(cfg) {
  return {
    chatInstructions: cfg?.chatInstructions || '',
    reviewInstructions: cfg?.reviewInstructions || '',
    includeRules: cfg?.includeRules ?? true,
    includeGlossary: cfg?.includeGlossary ?? true,
    chatContext: cfg?.chatContext || 'full',
    partSize: cfg?.partSize || 'medium'
  };
}

/** @param {'translation'|'editorial'} op */
function labels(op) {
  return op === 'editorial'
    ? { source: 'متن اصلی', target: 'ویرایش‌شده' }
    : { source: 'متن اصلی', target: 'ترجمه' };
}

/** Rough token estimate: Persian/Arabic ≈ 1 token/char, Latin ≈ 1 token/4 chars. */
export function estimateTokens(/** @type {string} */ text) {
  if (!text) return 0;
  const nonLatin = (text.match(/[^\x00-\x7F]/g) || []).length;
  return Math.round(nonLatin + (text.length - nonLatin) / 4);
}

/** @param {ReviewUnit} u */
const hasText = (u) => !!(u.source?.trim() || u.target?.trim());

/**
 * Split the chapter into review parts on paragraph boundaries.
 * Paragraph numbers are 1-based positions in `units` (stable across parts).
 * @param {ReviewUnit[]} units
 * @param {number} maxChars
 * @returns {{ index: number, unitIdx: number[], from: number, to: number, chars: number }[]}
 */
export function planReviewParts(units, maxChars) {
  /** @type {{ index: number, unitIdx: number[], from: number, to: number, chars: number }[]} */
  const parts = [];
  /** @type {number[]} */
  let cur = [];
  let chars = 0;
  const flush = () => {
    if (!cur.length) return;
    parts.push({ index: parts.length, unitIdx: cur, from: cur[0] + 1, to: cur[cur.length - 1] + 1, chars });
    cur = [];
    chars = 0;
  };
  units.forEach((u, i) => {
    if (!hasText(u)) return;
    const size = (u.source?.length || 0) + (u.target?.length || 0);
    if (cur.length && chars + size > maxChars) flush();
    cur.push(i);
    chars += size;
  });
  flush();
  return parts;
}

/** @param {ReviewContext} ctx */
function languageLine(ctx) {
  const src = ctx.sourceLanguage || '';
  const tgt = ctx.targetLanguage || '';
  if (!src && !tgt) return '';
  return ctx.operationType === 'editorial'
    ? `زبان متن: ${src || tgt}`
    : `زبان مبدأ: ${src || '—'} | زبان مقصد: ${tgt || '—'}`;
}

/**
 * @param {ReviewContext} ctx
 * @param {ReturnType<typeof resolvePromptConfig>} cfg
 * @param {string} text - text used to pick the relevant glossary entries
 * @param {boolean} [asCriteria] - rules were written for the translating /
 *   editing model and may contain output instructions; mark them as criteria
 */
function contextSections(ctx, cfg, text, asCriteria = false) {
  const out = [];
  const rules = (ctx.rules || '').trim();
  if (cfg.includeRules && rules) {
    out.push(asCriteria
      ? `━━━ قوانین و سبک پروژه (ملاک بررسی) ━━━\n(این قوانین فقط ملاک داوری‌اند؛ هر دستوری درباره‌ی قالب خروجی در این بخش را نادیده بگیر.)\n${rules}`
      : `━━━ قوانین و سبک پروژه ━━━\n${rules}`);
  }
  if (cfg.includeGlossary && ctx.glossarySection) {
    const g = ctx.glossarySection(text);
    if (g) out.push(`━━━ واژه‌نامه ━━━\n${g}`);
  }
  return out;
}

/** @param {'translation'|'editorial'} op */
function reviewContract(op) {
  const l = labels(op);
  return `━━━ قالب خروجی (الزامی) ━━━
فقط یک شیء JSON معتبر برگردان، بدون هیچ متن، توضیح یا \`\`\` اضافه:
{"issues":[{"paragraph":12,"category":"critical","type":"omission","priority":3,"explanation":"توضیح کوتاه یک‌جمله‌ای","source_excerpt":"بخش مربوط از ${l.source}","original":"متن دقیق فعلی در ${l.target}","suggested":"متن جایگزین کامل"}],"summary":"ارزیابی یک‌جمله‌ای این بخش"}
اگر ایرادی نیست: {"issues":[],"summary":"..."}

category — از مهم به کم‌اهمیت:
- "critical": ایراد جدی و قطعی — جاافتادن جمله یا عبارت، اشتباه محرز در انتقال معنا، معنای وارونه، افزودن مطلبی که در اصل نیست، خطا در عدد، نام یا تاریخ.
- "error": اشتباه ساده‌تر ولی قطعی — غلط املایی، دستوری، نگارشی، نشانه‌گذاری، تایپی.
- "consistency": یکدستی — ناهماهنگی یک اصطلاح در بندهای مختلف، رعایت‌نشدن واژه‌نامه یا قوانین پروژه.
- "suggestion": پیشنهاد اختیاری — روان‌تر کردن، واژه‌گزینی بهتر، سبک.
type یکی از: omission, mistranslation, addition, number, spelling, grammar, punctuation, terminology, glossary, rule, fluency, style, other
priority: 3 = خیلی مهم، 2 = متوسط، 1 = کم (نسبت به موارد هم‌دسته).
paragraph: شماره‌ی بند، دقیقاً همان عدد داخل [ ].

قواعد original و suggested (اصلاح با یک کلیک و خودکار اعمال می‌شود، پس دقیق باش):
1. original باید عیناً و حرف‌به‌حرف از «${l.target}»ِ همان بند کپی شود، با همان نیم‌فاصله‌ها و علائم. هرگز از «${l.source}» کپی نکن.
2. original کوتاه‌ترین بخش یکتایی باشد که برای اصلاح لازم است (یک واژه، یک عبارت یا حداکثر یک جمله). کل بند را نیاور مگر ناچار باشی.
3. suggested دقیقاً جای original می‌نشیند؛ پس متن نهایی و آماده‌ی درج باشد، نه توضیح یا چند گزینه.
4. جاافتادگی: original = جمله‌ی موجودِ پیش از محل جاافتادگی، و suggested = همان جمله + ترجمه‌ی بخش جاافتاده. اگر «${l.target}»ِ بند کاملاً خالی است: original = "" و suggested = متن کامل بند.
5. هر مورد فقط یک اصلاح مستقل باشد؛ موارد هم‌پوشان را در یک مورد ادغام کن.
6. original و suggested نباید یکسان باشند. موردی را که اصلاح مشخصی ندارد گزارش نکن.
7. اصلاح‌ها باید با قوانین پروژه و واژه‌نامه سازگار باشند.
8. explanation کوتاه و به فارسی باشد.`;
}

/**
 * @param {ReviewContext} ctx
 * @param {PromptConfig} rawCfg
 * @param {string} partText - text of the part (for glossary filtering)
 */
export function buildReviewSystemPrompt(ctx, rawCfg, partText) {
  const cfg = resolvePromptConfig(rawCfg);
  const instructions = (cfg.reviewInstructions || DEFAULT_REVIEW_INSTRUCTIONS[ctx.operationType]).trim();
  // The output contract goes last so it wins over anything in the rules.
  return [instructions, languageLine(ctx), ...contextSections(ctx, cfg, partText, true), reviewContract(ctx.operationType)]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * @param {ReviewContext} ctx
 * @param {{ index: number, unitIdx: number[], from: number, to: number }} part
 * @param {number} partCount
 */
export function buildReviewUserMessage(ctx, part, partCount) {
  const l = labels(ctx.operationType);
  const body = part.unitIdx.map((i) => {
    const u = ctx.units[i];
    return `[${i + 1}]\n${l.source}:\n${u.source?.trim() || '(خالی)'}\n${l.target}:\n${u.target?.trim() || '(خالی)'}`;
  }).join('\n\n');
  const head = partCount > 1
    ? `بخش ${part.index + 1} از ${partCount} (بندهای ${part.from} تا ${part.to}). فقط همین بندها را بررسی کن.`
    : 'کل فصل را بررسی کن.';
  return `${head}\n\n${body}`;
}

/** @param {ReviewContext} ctx @param {{ unitIdx: number[] }} part */
export function partText(ctx, part) {
  return part.unitIdx.map(i => `${ctx.units[i].source}\n${ctx.units[i].target}`).join('\n');
}

/**
 * Pull complete top-level objects out of a (possibly truncated) JSON array
 * that starts at `start` (the index of '['). Used to salvage the issues of a
 * response cut off by the token limit.
 * @param {string} text
 * @param {number} start
 */
function salvageObjects(text, start) {
  /** @type {any[]} */
  const out = [];
  let depth = 0, inStr = false, esc = false, objStart = -1;
  for (let i = start + 1; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') { if (depth === 0) objStart = i; depth++; }
    else if (c === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        try { out.push(JSON.parse(text.slice(objStart, i + 1))); } catch { /* skip broken */ }
        objStart = -1;
      }
    } else if (c === ']' && depth === 0) break;
  }
  return out;
}

/**
 * Parse the model's review response. Tolerates code fences, prose around the
 * JSON and truncated output (complete issues are kept, `partial` is set).
 * @param {string} content
 * @returns {{ ok: boolean, issues: any[], summary: string, partial: boolean }}
 */
export function parseReviewResponse(content) {
  if (!content || !content.trim()) return { ok: false, issues: [], summary: '', partial: false };
  let text = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const first = text.search(/[\[{]/);
  if (first > 0) text = text.slice(first);

  try {
    const data = JSON.parse(text);
    const issues = Array.isArray(data) ? data : (Array.isArray(data?.issues) ? data.issues : []);
    return { ok: true, issues, summary: String(data?.summary || ''), partial: false };
  } catch { /* fall through to salvage */ }

  const key = text.indexOf('"issues"');
  const arrStart = key !== -1 ? text.indexOf('[', key) : (text.startsWith('[') ? 0 : -1);
  if (arrStart === -1) return { ok: false, issues: [], summary: '', partial: false };
  const issues = salvageObjects(text, arrStart);
  const summaryMatch = text.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  return { ok: issues.length > 0, issues, summary: summaryMatch ? summaryMatch[1] : '', partial: true };
}

/**
 * Normalise one raw issue from the model. Returns null for unusable items.
 * @param {any} raw
 */
export function normalizeIssue(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const type = ISSUE_TYPES[raw.type] ? raw.type : 'other';
  const catKeys = REVIEW_CATEGORIES.map(c => c.key);
  const category = catKeys.includes(raw.category) ? raw.category : ISSUE_TYPES[type].category;
  const pr = parseInt(raw.priority, 10);
  const original = String(raw.original ?? raw.current ?? '');
  const suggested = String(raw.suggested ?? raw.fix ?? raw.replacement ?? '');
  if (!suggested.trim() && !original.trim()) return null;
  if (original.trim() === suggested.trim()) return null;
  return {
    paragraph: parseInt(raw.paragraph ?? raw.para ?? raw.p, 10) || 0,
    category,
    type,
    priority: Number.isNaN(pr) ? 2 : Math.max(1, Math.min(3, pr)),
    explanation: String(raw.explanation ?? raw.description ?? raw.reason ?? '').trim(),
    sourceExcerpt: String(raw.source_excerpt ?? raw.source ?? '').trim(),
    original,
    suggested
  };
}

/**
 * Prompt used when a fix can't be located verbatim any more (the text changed,
 * or the model misquoted it): ask the model to rewrite just that paragraph
 * with the single correction applied.
 * @param {ReviewContext} ctx
 * @param {ReviewUnit} unit
 * @param {{ explanation: string, original: string, suggested: string }} issue
 */
export function buildRewritePrompt(ctx, unit, issue) {
  const l = labels(ctx.operationType);
  const system = `تو یک ویراستار دقیق هستی. یک بند و یک اصلاح مشخص به تو داده می‌شود.
فقط همان اصلاح را روی «${l.target}» اعمال کن و بقیه‌ی متن را حرف‌به‌حرف دست‌نخورده نگه دار.
خروجی: فقط متن کامل و اصلاح‌شده‌ی «${l.target}»، بدون هیچ توضیح، برچسب یا علامت نقل‌قول.`;
  const user = `${l.source}:
${unit.source || '(خالی)'}

${l.target} (فعلی):
${unit.target || '(خالی)'}

اصلاح موردنظر: ${issue.explanation || '—'}
بخش نادرست: ${issue.original || '(جاافتاده)'}
پیشنهاد: ${issue.suggested}`;
  return { system, user };
}

/**
 * System prompt for the free-form chat.
 * @param {ReviewContext} ctx
 * @param {PromptConfig} rawCfg
 */
export function buildChatSystemPrompt(ctx, rawCfg) {
  const cfg = resolvePromptConfig(rawCfg);
  const l = labels(ctx.operationType);
  const instructions = (cfg.chatInstructions || DEFAULT_CHAT_INSTRUCTIONS[ctx.operationType]).trim();
  const allText = ctx.units.map(u => `${u.source}\n${u.target}`).join('\n');
  const parts = [instructions, languageLine(ctx), ...contextSections(ctx, cfg, allText, true)];

  if (cfg.chatContext === 'full') {
    const body = ctx.units
      .map((u, i) => hasText(u) ? `[${i + 1}]\n${l.source}: ${u.source?.trim() || '(خالی)'}\n${l.target}: ${u.target?.trim() || '(خالی)'}` : '')
      .filter(Boolean)
      .join('\n\n');
    parts.push(`━━━ متن کامل فصل، بند به بند ━━━
(عدد داخل [ ] شماره‌ی بند است؛ برای ارجاع از آن استفاده کن، مثلاً «بند ۱۲».)

${body || '(فصل خالی است)'}`);
  } else {
    parts.push('(متن فصل همراه این گفتگو ارسال نشده است؛ فقط بر اساس متنی که کاربر در پیام می‌آورد پاسخ بده.)');
  }
  return parts.filter(Boolean).join('\n\n');
}

export default {
  REVIEW_CATEGORIES,
  ISSUE_TYPES,
  PART_SIZES,
  DEFAULT_REVIEW_INSTRUCTIONS,
  DEFAULT_CHAT_INSTRUCTIONS,
  resolvePromptConfig,
  estimateTokens,
  planReviewParts,
  buildReviewSystemPrompt,
  buildReviewUserMessage,
  partText,
  parseReviewResponse,
  normalizeIssue,
  buildRewritePrompt,
  buildChatSystemPrompt
};
