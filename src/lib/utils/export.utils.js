/**
 * Get the layer-1 (sentence-aligned / comparative) translation text for a block,
 * matching exactly what the editor shows.
 *
 * - A manual edit always wins, even when cleared to an empty string (so an
 *   intentionally emptied block stays empty instead of resurrecting the old
 *   translation).
 * - For sentence-aligned blocks, each sentence that is still untranslated
 *   (error / pending) falls back to its SOURCE text, so no sentence is ever
 *   silently dropped and the original order is preserved.
 * - Editorial blocks (which use outputText / editedText) are supported too.
 * @param {any} b
 * @returns {string}
 */
function getBlockLayer1(b) {
  // Manual edit wins outright (empty edit => empty output).
  if (b.status === 'edited') {
    if (b.editedTranslation !== undefined && b.editedTranslation !== null) return b.editedTranslation;
    if (b.editedText !== undefined && b.editedText !== null) return b.editedText; // editorial
  }
  // Sentence-aligned translation (translation workspace).
  if (b.sentences && b.sentences.length > 0) {
    return b.sentences
      .map(s => (s.translation && s.translation.trim()) ? s.translation : (s.source || ''))
      .filter(Boolean)
      .join(' ');
  }
  // Editorial block output.
  if (b.outputText) return b.outputText;
  // Legacy single-field translation.
  return b.translation || '';
}

/**
 * Source-text fallback for a block whose translation/output is empty so that no
 * paragraph is silently lost. A block the user INTENTIONALLY cleared via a
 * manual edit stays empty (we must not resurrect its source). This mainly
 * matters for blocks that have no per-sentence data (e.g. unprocessed editorial
 * blocks); translation blocks already fall back to source per sentence.
 * @param {any} b
 * @returns {string}
 */
function blockSourceFallback(b) {
  if (b.status === 'edited') return '';
  return b.content || '';
}

/**
 * Compute the final output text for a chapter.
 * @param {any} chapter
 * @param {'layer1'|'layer2'|'both'} [layer='layer1']
 * @returns {string}
 */
function getFinalOutputText(chapter, layer = 'layer1') {
  // Use blocks-based output if available (new editor format)
  if (chapter.blocks && chapter.blocks.length > 0) {
    return chapter.blocks.map(b => {
      if (layer === 'layer2') {
        return b.paragraphTranslation || getBlockLayer1(b) || blockSourceFallback(b);
      }
      if (layer === 'both') {
        const l1 = getBlockLayer1(b) || blockSourceFallback(b);
        const l2 = b.paragraphTranslation || '';
        if (l1 && l2 && l1 !== l2) return `${l2}\n\n【لایه ۱】\n${l1}`;
        return l2 || l1;
      }
      // layer1 (default)
      return getBlockLayer1(b) || blockSourceFallback(b);
    }).filter(Boolean).join('\n\n');
  }
  // Legacy segmentData format
  if (chapter.segmentData && chapter.segmentData.length > 0) {
    return chapter.segmentData.map(s => {
      if (s.status === 'rejected') return s.sourceText;
      if (s.status === 'edited') return s.editedText || s.outputText;
      return s.outputText || s.sourceText;
    }).join('\n\n');
  }
  // Support legacy translatedText field for old records
  return chapter.outputText || chapter.translatedText || '';
}

export const exportUtils = {
  exportToJson(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    this.downloadFile(blob, filename);
  },

  async importFromJson(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          resolve(data);
        } catch (error) {
          reject(new Error('فایل JSON نامعتبر است'));
        }
      };
      reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
      reader.readAsText(file);
    });
  },

  downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
      reader.readAsText(file);
    });
  },

  /**
   * Export chapters to Markdown.
   * @param {any} project
   * @param {any[]} chapters
   * @param {{ includeSource?: boolean, outputLabel?: string, layer?: 'layer1'|'layer2'|'both', includeHeadings?: boolean, style?: 'styled'|'plain' }} options
   */
  exportToMarkdown(project, chapters, options = {}) {
    const {
      includeSource = true,
      outputLabel = '\u062e\u0631\u0648\u062c\u06cc',
      layer = 'layer1',
      includeHeadings = false,
      style = 'styled'
    } = options;
    const plain = style === 'plain';
    const sourceLabel = '\u0645\u062a\u0646 \u0627\u0635\u0644\u06cc';

    let md = plain ? `${project.title}\n\n` : `# ${project.title}\n\n`;

    if (project.description) {
      md += `${project.description}\n\n`;
    }

    if (!plain) md += `---\n\n`;

    for (const chapter of chapters) {
      if (includeHeadings) {
        md += plain ? `${chapter.title}\n\n` : `## ${chapter.title}\n\n`;
      }

      if (includeSource && chapter.sourceText) {
        md += plain
          ? `${chapter.sourceText}\n\n`
          : `### ${sourceLabel}\n\n${chapter.sourceText}\n\n`;
      }

      const output = getFinalOutputText(chapter, layer);
      if (output) {
        md += plain ? `${output}\n\n` : `### ${outputLabel}\n\n${output}\n\n`;
      }

      if (!plain) md += `---\n\n`;
    }

    return md;
  },

  /**
   * Export to plain text.
   * @param {any[]} chapters
   * @param {'output'|'source'} type
   */
  exportToTxt(chapters, type = 'output') {
    return chapters
      .map(c => type === 'output' ? getFinalOutputText(c) : (c.sourceText || ''))
      .filter(t => t)
      .join('\n\n---\n\n');
  },

  /**
   * Generate Word-compatible HTML for a project export.
   * @param {any} project
   * @param {any[]} chapters
   * @param {{ includeSource?: boolean, outputLabel?: string, layer?: 'layer1'|'layer2'|'both', includeHeadings?: boolean, style?: 'styled'|'plain' }} options
   */
  generateWordHtml(project, chapters, options = {}) {
    const {
      includeSource = false,
      outputLabel = '\u062e\u0631\u0648\u062c\u06cc',
      layer = 'layer1',
      includeHeadings = false,
      style = 'styled'
    } = options;
    const isRtl = true; // Default RTL for Persian content
    const plain = style === 'plain';

    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${project.title}</title>
        <!--[if gte mso 9]>
        <xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom></w:WordDocument></xml>
        <![endif]-->
        <style>
          body { font-family: 'B Nazanin', Tahoma, Arial, sans-serif; font-size: 14pt; }
          h1, h2, h3 { font-family: 'B Nazanin', Tahoma, Arial, sans-serif; }
          p { margin: 0.5em 0; line-height: 1.8; }
          .source-section { color: #555; font-size: 12pt; }
          .output-section { color: #000; }
          .chapter-separator { border-top: 1px solid #ccc; margin: 1.5em 0; }
        </style>
      </head>
      <body dir="${isRtl ? 'rtl' : 'ltr'}">
    `;

    // Document title
    html += plain
      ? `<p dir="auto"><b>${project.title}</b></p>`
      : `<h1>${project.title}</h1>`;
    if (project.description) html += `<p dir="auto">${project.description}</p>`;
    if (!plain) html += `<hr/>`;

    for (const chapter of chapters) {
      // Chapter title (the sidebar/menu label) — only when explicitly requested,
      // since it is usually an untranslated heading the user doesn't want inline.
      if (includeHeadings) {
        html += plain
          ? `<p dir="auto"><b>${chapter.title}</b></p>`
          : `<h2>${chapter.title}</h2>`;
      }

      if (includeSource && chapter.sourceText) {
        html += `<div class="source-section" dir="auto">`;
        if (!plain) html += `<h3>متن اصلی</h3>`;
        chapter.sourceText.split('\n').forEach(line => {
          html += `<p dir="auto">${line || '&nbsp;'}</p>`;
        });
        html += `</div>`;
      }

      const output = getFinalOutputText(chapter, layer);
      if (output) {
        html += `<div class="output-section" dir="auto">`;
        if (!plain && includeSource) html += `<h3>${outputLabel}</h3>`;
        output.split('\n').forEach(line => {
          html += `<p dir="auto">${line || '&nbsp;'}</p>`;
        });
        html += `</div>`;
      }

      html += plain ? `<p dir="auto">&nbsp;</p>` : `<div class="chapter-separator"><br/></div>`;
    }

    html += `</body></html>`;
    return html;
  },

  /**
   * Export project to Word (.doc) file.
   * @param {any} project
   * @param {any[]} chapters
   * @param {{ includeSource?: boolean, outputLabel?: string, layer?: 'layer1'|'layer2'|'both' }} options
   */
  exportToWord(project, chapters, options = {}) {
    const html = this.generateWordHtml(project, chapters, options);
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const filename = `${project.title || 'export'}.doc`;
    this.downloadFile(blob, filename);
  }
};

export default exportUtils;
