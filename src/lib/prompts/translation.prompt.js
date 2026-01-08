export function getTranslationPrompt(text, sourceLanguage, targetLanguage, rules = {}) {
  const languageNames = {
    en: 'English',
    fa: 'Persian (Farsi)',
    ar: 'Arabic',
    de: 'German',
    fr: 'French'
  };

  const sourceLang = languageNames[sourceLanguage] || sourceLanguage;
  const targetLang = languageNames[targetLanguage] || targetLanguage;

  let rulesSection = '';
  
  if (rules.tone?.length > 0) {
    rulesSection += `- Tone: ${rules.tone.join(', ')}\n`;
  }
  if (rules.vocabularyLevel) {
    rulesSection += `- Vocabulary Level: ${rules.vocabularyLevel}\n`;
  }
  if (rules.translationType) {
    rulesSection += `- Translation Type: ${rules.translationType}\n`;
  }
  if (rules.fidelity) {
    rulesSection += `- Fidelity to original: ${rules.fidelity}\n`;
  }
  if (rules.customRules?.length > 0) {
    rulesSection += `- Custom Rules:\n${rules.customRules.map(r => `  * ${r}`).join('\n')}\n`;
  }

  const systemPrompt = rules.systemPrompt ? `\nAdditional Instructions:\n${rules.systemPrompt}\n` : '';

  return `You are an expert translator specializing in ${sourceLang} to ${targetLang} translation.

Task: Translate the following text from ${sourceLang} to ${targetLang}.

${rulesSection ? `Translation Guidelines:\n${rulesSection}` : ''}
${systemPrompt}
Text to translate:
"""
${text}
"""

Important:
1. Provide ONLY the translation, no explanations or notes
2. Maintain the original formatting (paragraphs, line breaks)
3. Preserve any markdown formatting if present
4. Be accurate and natural in the target language`;
}

export function getTranslationSystemMessage(sourceLanguage, targetLanguage, rules = {}) {
  const languageNames = {
    en: 'English',
    fa: 'Persian (Farsi)',
    ar: 'Arabic',
    de: 'German',
    fr: 'French'
  };

  const sourceLang = languageNames[sourceLanguage] || sourceLanguage;
  const targetLang = languageNames[targetLanguage] || targetLanguage;

  return `You are a professional translator from ${sourceLang} to ${targetLang}. 
Your translations are accurate, natural, and culturally appropriate.
${rules.systemPrompt || ''}`;
}

export default getTranslationPrompt;
