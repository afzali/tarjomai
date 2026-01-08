export const textUtils = {
  splitIntoSentences(text) {
    if (!text) return [];
    
    const sentenceEnders = /([.!?؟۔।。！？]+[\s\n]+|[.!?؟۔।。！？]+$)/g;
    const sentences = text.split(sentenceEnders).filter(s => s.trim());
    
    const result = [];
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i] + (sentences[i + 1] || '');
      if (sentence.trim()) {
        result.push(sentence.trim());
      }
    }
    
    return result;
  },

  alignSentences(sourceSentences, targetSentences) {
    const aligned = [];
    const maxLength = Math.max(sourceSentences.length, targetSentences.length);
    
    for (let i = 0; i < maxLength; i++) {
      aligned.push({
        index: i,
        source: sourceSentences[i] || '',
        target: targetSentences[i] || ''
      });
    }
    
    return aligned;
  },

  detectLanguage(text) {
    if (!text) return 'unknown';
    
    const persianPattern = /[\u0600-\u06FF]/;
    const arabicPattern = /[\u0627-\u064A]/;
    const latinPattern = /[a-zA-Z]/;
    
    const persianCount = (text.match(persianPattern) || []).length;
    const latinCount = (text.match(latinPattern) || []).length;
    
    if (persianCount > latinCount) {
      return 'fa';
    } else if (latinCount > 0) {
      return 'en';
    }
    
    return 'unknown';
  },

  detectDirection(text) {
    if (!text) return 'ltr';
    
    const rtlPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const firstChar = text.trim().charAt(0);
    
    return rtlPattern.test(firstChar) ? 'rtl' : 'ltr';
  },

  countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(w => w).length;
  },

  countCharacters(text) {
    if (!text) return 0;
    return text.length;
  },

  truncate(text, maxLength, suffix = '...') {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }
};

export default textUtils;
