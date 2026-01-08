import db from '$lib/db/index.js';

export const chaptersService = {
  async getChaptersByProject(projectId) {
    return await db.chapters.where('projectId').equals(projectId).sortBy('order');
  },

  async getChapter(id) {
    return await db.chapters.get(id);
  },

  async createChapter(chapterData) {
    const existingChapters = await this.getChaptersByProject(chapterData.projectId);
    const maxOrder = existingChapters.length > 0 
      ? Math.max(...existingChapters.map(c => c.order)) 
      : 0;

    const chapter = {
      ...chapterData,
      order: chapterData.order ?? maxOrder + 1,
      status: 'pending',
      sourceText: chapterData.sourceText || '',
      translatedText: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const id = await db.chapters.add(chapter);
    return { ...chapter, id };
  },

  async updateChapter(id, updates) {
    await db.chapters.update(id, { ...updates, updatedAt: new Date() });
    return this.getChapter(id);
  },

  async deleteChapter(id) {
    await db.chapters.delete(id);
  },

  async reorderChapters(projectId, orderedIds) {
    const updates = orderedIds.map((id, index) => 
      db.chapters.update(id, { order: index + 1 })
    );
    await Promise.all(updates);
  },

  async updateTranslation(id, translatedText) {
    await db.chapters.update(id, { 
      translatedText, 
      status: 'completed',
      updatedAt: new Date() 
    });
    return this.getChapter(id);
  },

  async setStatus(id, status) {
    await db.chapters.update(id, { status, updatedAt: new Date() });
    return this.getChapter(id);
  }
};

export default chaptersService;
