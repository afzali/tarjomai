import db from '$lib/db/index.js';

export const reviewService = {
  async getMessages(chapterId) {
    return await db.reviewMessages.where('chapterId').equals(chapterId).sortBy('createdAt');
  },

  /**
   * @param {number} chapterId
   * @param {'user'|'assistant'} role
   * @param {string} content
   * @param {string|null} [model]
   * @param {{ isError?: boolean, stopped?: boolean, usage?: any }} [meta]
   */
  async addMessage(chapterId, role, content, model = null, meta = {}) {
    const message = {
      chapterId,
      role, // 'user' | 'assistant'
      content,
      model,
      ...JSON.parse(JSON.stringify(meta || {})),
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
  },

  // --- Structured chapter reviews ("بررسی کلی") ---

  /** Latest review run of a chapter, or null. @param {number} chapterId */
  async getLatestRun(chapterId) {
    const runs = await db.reviewRuns.where('chapterId').equals(chapterId).sortBy('createdAt');
    return runs[runs.length - 1] || null;
  },

  /** Latest review run per chapter, for the chapter list. @param {number[]} chapterIds */
  async getLatestRunsByChapter(chapterIds) {
    /** @type {Map<number, any>} */
    const map = new Map();
    if (!chapterIds.length) return map;
    const runs = await db.reviewRuns.where('chapterId').anyOf(chapterIds).toArray();
    for (const r of runs) {
      const prev = map.get(r.chapterId);
      if (!prev || r.createdAt > prev.createdAt) map.set(r.chapterId, r);
    }
    return map;
  },

  /** Insert or update a run (plain-object copy, so Svelte proxies are safe). @param {any} run */
  async saveRun(run) {
    const plain = JSON.parse(JSON.stringify(run));
    if (plain.id) {
      await db.reviewRuns.put(plain);
      return plain;
    }
    const id = await db.reviewRuns.add(plain);
    return { ...plain, id };
  },

  /** @param {number} chapterId */
  async deleteRuns(chapterId) {
    await db.reviewRuns.where('chapterId').equals(chapterId).delete();
  }
};

export default reviewService;
