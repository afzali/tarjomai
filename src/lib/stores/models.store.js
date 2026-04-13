import { writable } from 'svelte/store';
import { openrouterService } from '$lib/services/openrouter.service.js';
import { allModels as fallbackModels } from '$lib/models.js';

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

function createModelsStore() {
  const { subscribe, set, update } = writable({
    models: /** @type {Array<{id:string,name:string,provider:string,contextLength?:number,pricing?:any}>} */ ([]),
    loading: false,
    lastFetchTime: 0,
    error: null
  });

  return {
    subscribe,

    /**
     * Fetch text-capable models from OpenRouter, with in-memory cache and fallback.
     * @param {string} apiKey
     */
    async fetch(apiKey) {
      let current;
      const unsub = subscribe(v => { current = v; });
      unsub();

      // Return from cache if still fresh
      if (current.models.length > 0 && Date.now() - current.lastFetchTime < CACHE_DURATION) {
        return current.models;
      }

      if (!apiKey) {
        set({ models: fallbackModels, loading: false, lastFetchTime: Date.now(), error: null });
        return fallbackModels;
      }

      update(s => ({ ...s, loading: true, error: null }));

      try {
        const rawModels = await openrouterService.getAvailableModels(apiKey);
        if (!rawModels || rawModels.length === 0) {
          set({ models: fallbackModels, loading: false, lastFetchTime: Date.now(), error: null });
          return fallbackModels;
        }

        // Filter: only models that support text output
        const textModels = rawModels.filter((/** @type {any} */ m) => {
          const arch = m.architecture;
          if (arch) {
            const modality = arch.modality || '';
            const outputModality = arch.output_modality || modality;
            if (outputModality && !outputModality.includes('text')) return false;
          }
          const id = m.id || '';
          if (id.includes('/moderation') || id.includes('/embedding') || id.includes('/tts') || id.includes('/image')) return false;
          return true;
        });

        const models = textModels.map((/** @type {any} */ m) => {
          const parts = m.id.split('/');
          const provider = parts[0] || 'Unknown';
          const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
          return {
            id: m.id,
            name: m.name || m.id,
            provider: providerName,
            contextLength: m.context_length || 0,
            pricing: m.pricing || null
          };
        });

        // Sort by provider then name
        models.sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));

        set({ models, loading: false, lastFetchTime: Date.now(), error: null });
        return models;
      } catch (e) {
        console.error('Failed to fetch models from OpenRouter:', e);
        set({ models: fallbackModels, loading: false, lastFetchTime: Date.now(), error: String(e) });
        return fallbackModels;
      }
    },

    clearCache() {
      update(s => ({ ...s, models: [], lastFetchTime: 0 }));
    }
  };
}

export const modelsStore = createModelsStore();

// Backward-compat: keep the old function exports so existing wizard pages don't break
export async function fetchModels(apiKey) {
  return modelsStore.fetch(apiKey);
}

export function clearModelCache() {
  modelsStore.clearCache();
}

export default modelsStore;
