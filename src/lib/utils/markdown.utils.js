import { marked } from 'marked';

export const markdownUtils = {
  parse(markdown) {
    if (!markdown) return '';
    return marked.parse(markdown);
  },

  render(markdown) {
    return this.parse(markdown);
  },

  sanitize(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    
    const scripts = div.querySelectorAll('script');
    scripts.forEach(s => s.remove());
    
    const dangerous = div.querySelectorAll('[onclick], [onerror], [onload]');
    dangerous.forEach(el => {
      el.removeAttribute('onclick');
      el.removeAttribute('onerror');
      el.removeAttribute('onload');
    });
    
    return div.innerHTML;
  },

  extractHeadings(markdown) {
    if (!markdown) return [];
    const headingPattern = /^(#{1,6})\s+(.+)$/gm;
    const headings = [];
    let match;
    
    while ((match = headingPattern.exec(markdown)) !== null) {
      headings.push({
        level: match[1].length,
        text: match[2].trim()
      });
    }
    
    return headings;
  },

  extractParagraphs(markdown) {
    if (!markdown) return [];
    return markdown
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p && !p.startsWith('#'));
  },

  toPlainText(markdown) {
    if (!markdown) return '';
    return markdown
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/!\[.*?\]\(.+?\)/g, '')
      .trim();
  }
};

export default markdownUtils;
