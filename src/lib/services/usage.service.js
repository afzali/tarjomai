import { db } from '$lib/db';

export const usageService = {
  async addUsage(data) {
    const now = new Date();
    const record = {
      model: data.model,
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
      cost: data.usage?.cost || 0,
      projectId: data.projectId || null,
      chapterId: data.chapterId || null,
      operationType: data.operationType || null,
      date: now.toISOString().slice(0, 10),
      timestamp: now.toISOString()
    };
    
    return await db.usageHistory.add(record);
  },

  async getByChapter(chapterId) {
    return await db.usageHistory
      .where('chapterId').equals(chapterId)
      .sortBy('timestamp');
  },

  async getByProject(projectId) {
    return await db.usageHistory
      .where('projectId').equals(projectId)
      .sortBy('timestamp');
  },

  async getByDate(date) {
    return await db.usageHistory
      .where('date').equals(date)
      .toArray();
  },

  async getDailyBreakdown(projectId) {
    const records = projectId
      ? await db.usageHistory.where('projectId').equals(projectId).toArray()
      : await db.usageHistory.toArray();
    /** @type {Record<string, { date: string, cost: number, tokens: number, requests: number, details: any[] }>} */
    const byDay = {};
    for (const r of records) {
      const d = r.date || r.timestamp?.slice(0, 10) || '?';
      if (!byDay[d]) byDay[d] = { date: d, cost: 0, tokens: 0, requests: 0, details: [] };
      byDay[d].cost += r.cost || 0;
      byDay[d].tokens += r.totalTokens || 0;
      byDay[d].requests += 1;
      byDay[d].details.push(r);
    }
    return Object.values(byDay).sort((a, b) => b.date.localeCompare(a.date));
  },

  async getChapterStats(chapterId) {
    const records = await this.getByChapter(chapterId);
    return records.reduce((acc, r) => ({
      totalCost: acc.totalCost + (r.cost || 0),
      totalTokens: acc.totalTokens + (r.totalTokens || 0),
      requests: acc.requests + 1
    }), { totalCost: 0, totalTokens: 0, requests: 0 });
  },

  async getHistory(limit = 50) {
    return await db.usageHistory
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
  },

  async getAllHistory() {
    return await db.usageHistory
      .orderBy('timestamp')
      .reverse()
      .toArray();
  },

  async searchHistory(query, filters = {}) {
    let records = await db.usageHistory.orderBy('timestamp').reverse().toArray();
    
    // Filter by search query (model name)
    if (query) {
      const lowerQuery = query.toLowerCase();
      records = records.filter(r => r.model?.toLowerCase().includes(lowerQuery));
    }
    
    // Filter by date range
    if (filters.startDate) {
      records = records.filter(r => new Date(r.timestamp) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      records = records.filter(r => new Date(r.timestamp) <= new Date(filters.endDate));
    }
    
    // Filter by model
    if (filters.model) {
      records = records.filter(r => r.model === filters.model);
    }
    
    return records;
  },

  async getUniqueModels() {
    const all = await db.usageHistory.toArray();
    const models = [...new Set(all.map(r => r.model))];
    return models.filter(Boolean);
  },

  async getTotalUsage() {
    const all = await db.usageHistory.toArray();
    return all.reduce((acc, item) => ({
      totalPromptTokens: acc.totalPromptTokens + (item.promptTokens || 0),
      totalCompletionTokens: acc.totalCompletionTokens + (item.completionTokens || 0),
      totalTokens: acc.totalTokens + (item.totalTokens || 0),
      totalCost: acc.totalCost + (item.cost || 0),
      requestCount: acc.requestCount + 1
    }), {
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0
    });
  },

  async getUsageByModel() {
    const all = await db.usageHistory.toArray();
    const byModel = {};
    
    for (const item of all) {
      if (!byModel[item.model]) {
        byModel[item.model] = {
          model: item.model,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          cost: 0,
          requests: 0
        };
      }
      byModel[item.model].promptTokens += item.promptTokens || 0;
      byModel[item.model].completionTokens += item.completionTokens || 0;
      byModel[item.model].totalTokens += item.totalTokens || 0;
      byModel[item.model].cost += item.cost || 0;
      byModel[item.model].requests += 1;
    }
    
    return Object.values(byModel);
  },

  async clearHistory() {
    return await db.usageHistory.clear();
  },

  formatCost(cost) {
    if (!cost) return '$0.000000';
    return '$' + cost.toFixed(6);
  }
};

export default usageService;
