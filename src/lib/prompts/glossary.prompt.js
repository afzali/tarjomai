/**
 * Glossary extraction prompts.
 *
 * The prompt is split into two parts:
 *  - The EDITABLE content prompt (role + how many terms + domain focus). The user
 *    can freely change this in the UI.
 *  - The FIXED format instruction, which is ALWAYS appended by the system and is
 *    NOT editable. This guarantees the model returns a clean JSON array so the
 *    glossary table never breaks when rendering.
 */

const languageNames = {
  en: 'English',
  fa: 'Persian (Farsi)',
  ar: 'Arabic',
  de: 'German',
  fr: 'French'
};

/** @param {string} code */
export function langName(code) {
  return languageNames[/** @type {keyof typeof languageNames} */ (code)] || code || '';
}

/** Default editable content prompt. {{count}} is replaced with the target term count. */
export const defaultGlossaryPrompt = `تو یک مترجم خبره و متخصص در استخراج اصطلاحات تخصصی هستی.
متن زیر را با دقت بخوان و حداکثر {{count}} مورد از کلیدی‌ترین، سنگین‌ترین و تخصصی‌ترین اصطلاحات، مفاهیم و ترکیب‌های آن را استخراج کن.
برای هر اصطلاح، دقیق‌ترین و فاخرترین معادل را در زبان مقصد پیدا کن. روی واژگان تخصصی، کلیدی و پرتکرار تمرکز کن و از اصطلاحات عمومی و روزمره صرف‌نظر کن.`;

/**
 * The fixed, non-editable JSON-format instruction. Always appended to the system message.
 * Keys are language-agnostic (source/target/note) so parsing and display stay consistent
 * regardless of the project's languages.
 */
export const fixedGlossaryFormatInstruction = `خروجی را دقیقاً و فقط به صورت یک آرایه‌ی JSON معتبر برگردان. هر عضو آرایه دقیقاً این سه کلید را دارد:
[{"source": "اصطلاح به زبان مبدأ", "target": "معادل دقیق در زبان مقصد", "note": "توضیح کوتاه کاربرد در صورت لزوم، وگرنه رشته‌ی خالی"}]
هیچ متن، عنوان، توضیح یا بلوک کد (markdown) اضافه‌ای ننویس. فقط آرایه‌ی JSON خام.`;

/**
 * Build the system + user messages for one extraction chunk.
 * @param {object} args
 * @param {string} args.contentPrompt  editable content prompt (may contain {{count}})
 * @param {string} args.chunk          the text chunk to extract from
 * @param {number} args.count          target number of terms
 * @param {string} args.sourceLanguage language code
 * @param {string} args.targetLanguage language code
 */
export function buildGlossaryExtractionMessages({ contentPrompt, chunk, count, sourceLanguage, targetLanguage }) {
  const src = langName(sourceLanguage);
  const tgt = langName(targetLanguage);
  const filledPrompt = (contentPrompt || defaultGlossaryPrompt).replace(/\{\{count\}\}/g, String(count));

  const system = `${filledPrompt}

زبان مبدأ (متن): ${src}
زبان مقصد (معادل‌ها): ${tgt}

${fixedGlossaryFormatInstruction}`;

  const user = `متن:
"""
${chunk}
"""`;

  return { system, user };
}

export default buildGlossaryExtractionMessages;
