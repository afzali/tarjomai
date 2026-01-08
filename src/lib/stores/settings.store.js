import { writable } from 'svelte/store';
import settingsService from '$lib/services/settings.service.js';

function createSettingsStore() {
  const { subscribe, set, update } = writable(null);

  return {
    subscribe,
    
    async load() {
      const settings = await settingsService.getSettings();
      set(settings);
      return settings;
    },

    async save(newSettings) {
      const settings = await settingsService.saveSettings(newSettings);
      set(settings);
      return settings;
    },

    async hasApiKey() {
      return await settingsService.hasApiKey();
    },

    async clearAll() {
      await settingsService.clearAllData();
      set(settingsService.getDefaultSettings());
    }
  };
}

export const settingsStore = createSettingsStore();
export default settingsStore;
