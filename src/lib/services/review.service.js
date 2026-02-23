import db from '$lib/db/index.js';

export const reviewService = {
  async getMessages(chapterId) {
    return await db.reviewMessages.where('chapterId').equals(chapterId).sortBy('createdAt');
  },

  async addMessage(chapterId, role, content, model = null) {
    const message = {
      chapterId,
      role, // 'user' | 'assistant'
      content,
      model,
      createdAt: new Date().toISOString()
    };
    const id = await db.reviewMessages.add(message);
    return { ...message, id };
  },

  async clearMessages(chapterId) {
    await db.reviewMessages.where('chapterId').equals(chapterId).delete();
  },

  async deleteMessage(id) {
    await db.reviewMessages.delete(id);
  }
};

export default reviewService;
