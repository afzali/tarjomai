import db from '$lib/db/index.js';

const SETTINGS_ID = 1;

export const settingsService = {
  async getSettings() {
    const settings = await db.settings.get(SETTINGS_ID);
    return settings || this.getDefaultSettings();
  },

  async saveSettings(settings) {
    // Convert Svelte 5 Proxy to plain object to avoid DataCloneError in IndexedDB
    const plainSettings = JSON.parse(JSON.stringify(settings));
    const existing = await db.settings.get(SETTINGS_ID);
    if (existing) {
      await db.settings.update(SETTINGS_ID, { ...plainSettings, updatedAt: new Date().toISOString() });
    } else {
      await db.settings.add({ ...plainSettings, id: SETTINGS_ID, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    return this.getSettings();
  },

  async hasApiKey() {
    const settings = await this.getSettings();
    return !!settings.openRouterApiKey;
  },

  async clearAllData() {
    await db.settings.clear();
    await db.projects.clear();
    await db.chapters.clear();
    await db.operationConfig.clear();
    await db.presets.clear();
    await db.usageHistory.clear();
    await db.reviewMessages.clear();
    await db.folders.clear();
  },

  getDefaultSettings() {
    return {
      id: SETTINGS_ID,
      openRouterApiKey: '',
      uiLanguage: 'fa',
      defaultModels: {
        styleAnalysis: 'google/gemini-3.1-pro-preview',
        translation: 'google/gemini-3.1-pro-preview',
        scoring: 'google/gemini-3.1-pro-preview',
        editorial: 'google/gemini-3.5-flash'
      },
      defaultSourceLanguage: 'en',
      defaultTargetLanguage: 'fa',
      textDirection: 'auto'
    };
  }
};

export default settingsService;
