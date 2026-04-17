/**
 * Compute the final output text for a chapter.
 * For editorial chapters with segmentData, computes from accepted/rejected/edited segments.
 * For all other chapters, returns outputText directly.
 * @param {any} chapter
 * @returns {string}
 */
function getFinalOutputText(chapter) {
  // Use blocks-based output if available (new editor format)
  if (chapter.blocks && chapter.blocks.length > 0) {
    return chapter.blocks.map(b => {
      // If block has edited translation, use it
      if (b.status === 'edited' && b.editedTranslation) return b.editedTranslation;
      // If block has sentences, join them
      if (b.sentences && b.sentences.length > 0) {
        return b.sentences.map(s => s.translation).filter(Boolean).join(' ');
      }
      // Fallback to legacy fields
      return b.translation || b.content || '';
    }).join('\n\n');
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
   * @param {{ includeSource?: boolean, outputLabel?: string }} options
   */
  exportToMarkdown(project, chapters, options = {}) {
    const { includeSource = true, outputLabel = 'خروجی' } = options;
    let md = `# ${project.title}\n\n`;

    if (project.description) {
      md += `${project.description}\n\n`;
    }

    md += `---\n\n`;

    for (const chapter of chapters) {
      md += `## ${chapter.title}\n\n`;

      if (includeSource && chapter.sourceText) {
        md += `### متن اصلی\n\n${chapter.sourceText}\n\n`;
      }

      const output = getFinalOutputText(chapter);
      if (output) {
        md += `### ${outputLabel}\n\n${output}\n\n`;
      }

      md += `---\n\n`;
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
   * @param {{ includeSource?: boolean, outputLabel?: string }} options
   */
  generateWordHtml(project, chapters, options = {}) {
    const { includeSource = false, outputLabel = 'خروجی' } = options;
    const isRtl = true; // Default RTL for Persian content

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
        <h1>${project.title}</h1>
        ${project.description ? `<p>${project.description}</p>` : ''}
        <hr/>
    `;

    for (const chapter of chapters) {
      html += `<h2>${chapter.title}</h2>`;

      if (includeSource && chapter.sourceText) {
        html += `<div class="source-section">`;
        html += `<h3>متن اصلی</h3>`;
        chapter.sourceText.split('\n').forEach(line => {
          html += `<p>${line || '&nbsp;'}</p>`;
        });
        html += `</div>`;
      }

      const output = getFinalOutputText(chapter);
      if (output) {
        html += `<div class="output-section">`;
        if (includeSource) html += `<h3>${outputLabel}</h3>`;
        output.split('\n').forEach(line => {
          html += `<p>${line || '&nbsp;'}</p>`;
        });
        html += `</div>`;
      }

      html += `<div class="chapter-separator"><br/></div>`;
    }

    html += `</body></html>`;
    return html;
  },

  /**
   * Export project to Word (.doc) file.
   * @param {any} project
   * @param {any[]} chapters
   * @param {{ includeSource?: boolean, outputLabel?: string }} options
   */
  exportToWord(project, chapters, options = {}) {
    const html = this.generateWordHtml(project, chapters, options);
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const filename = `${project.title || 'export'}.doc`;
    this.downloadFile(blob, filename);
  }
};

export default exportUtils;
