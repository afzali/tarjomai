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

  exportToMarkdown(project, chapters) {
    let md = `# ${project.title}\n\n`;
    
    if (project.description) {
      md += `${project.description}\n\n`;
    }
    
    md += `---\n\n`;
    
    for (const chapter of chapters) {
      md += `## ${chapter.title}\n\n`;
      
      if (chapter.sourceText) {
        md += `### متن اصلی\n\n${chapter.sourceText}\n\n`;
      }
      
      if (chapter.translatedText) {
        md += `### ترجمه\n\n${chapter.translatedText}\n\n`;
      }
      
      md += `---\n\n`;
    }
    
    return md;
  },

  exportToTxt(chapters, type = 'translated') {
    return chapters
      .map(c => type === 'translated' ? c.translatedText : c.sourceText)
      .filter(t => t)
      .join('\n\n---\n\n');
  }
};

export default exportUtils;
