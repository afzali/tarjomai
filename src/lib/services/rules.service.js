import db from '$lib/db/index.js';

export const rulesService = {
  async getRules(projectId) {
    return await db.translationRules.where('projectId').equals(projectId).first();
  },

  async saveRules(projectId, rulesData) {
    const existing = await this.getRules(projectId);
    
    const rules = {
      ...rulesData,
      projectId,
      updatedAt: new Date()
    };

    if (existing) {
      await db.translationRules.update(existing.id, rules);
      return { ...existing, ...rules };
    } else {
      rules.createdAt = new Date();
      rules.isPreset = false;
      const id = await db.translationRules.add(rules);
      return { ...rules, id };
    }
  },

  async getPresets() {
    return await db.presets.orderBy('name').toArray();
  },

  async savePreset(presetData) {
    const preset = {
      ...presetData,
      createdAt: new Date()
    };
    const id = await db.presets.add(preset);
    return { ...preset, id };
  },

  async deletePreset(id) {
    await db.presets.delete(id);
  },

  async applyPreset(projectId, presetId) {
    const preset = await db.presets.get(presetId);
    if (!preset) return null;

    const { id, createdAt, ...presetRules } = preset;
    return this.saveRules(projectId, presetRules);
  },

  async exportRules(projectId) {
    const rules = await this.getRules(projectId);
    if (!rules) return null;

    const { id, projectId: pid, ...exportData } = rules;
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      rules: exportData
    };
  },

  async importRules(projectId, data) {
    if (!data.rules) return null;
    return this.saveRules(projectId, data.rules);
  },

  getDefaultRules() {
    return {
      name: 'Default',
      tone: ['formal'],
      sentenceStructure: 'standard',
      vocabularyLevel: 'medium',
      fidelity: 'medium',
      translationType: 'balanced',
      customRules: [],
      systemPrompt: ''
    };
  }
};

export default rulesService;
