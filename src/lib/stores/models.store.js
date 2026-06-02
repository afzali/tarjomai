import { writable } from 'svelte/store';
import { openrouterService } from '$lib/services/openrouter.service.js';
import { allModels as fallbackModels } from '$lib/models.js';
import db from '$lib/db/index.js';

const CACHE_ID = 1;
const MEMORY_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (in-memory dedupe)

/** Normalize a raw OpenRouter model object into our compact shape. */
function normalizeRawModel(/** @type {any} */ m) {
  const parts = (m.id || '').split('/');
  const provider = parts[0] || 'Unknown';
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
  return {
    id: m.id,
    name: m.name || m.id,
    provider: providerName,
    contextLength: m.context_length || 0,
    pricing: m.pricing || null
  };
}

/** Keep only text-output models (drop image/audio/embedding/moderation). */
function filterTextModels(/** @type {any[]} */ rawModels) {
  return rawModels.filter((/** @type {any} */ m) => {
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
}

function createModelsStore() {
  const { subscribe, set, update } = writable({
    models: /** @type {Array<{id:string,name:string,provider:string,contextLength?:number,pricing?:any}>} */ ([]),
    loading: false,
    lastFetchTime: 0,
    error: null
  });

  /** Read the persisted catalogue from IndexedDB (empty array if none). */
  async function readPersisted() {
    try {
      const row = await db.table('modelCache').get(CACHE_ID);
      return row || null;
    } catch {
      return null;
    }
  }

  /** Persist the catalogue to IndexedDB. */
  async function writePersisted(/** @type {any[]} */ models) {
    try {
      await db.table('modelCache').put({ id: CACHE_ID, models, updatedAt: new Date().toISOString() });
    } catch {
      // ignore persistence errors — in-memory cache still works
    }
  }

  return {
    subscribe,

    /**
     * Return the model list, preferring (1) in-memory cache, (2) persisted DB
     * cache, (3) a live fetch, (4) the built-in fallback. Does NOT force a
     * network call if a persisted cache exists — use refresh() for that.
     * @param {string} [apiKey]
     */
    async fetch(apiKey) {
      let current;
      const unsub = subscribe(v => { current = v; });
      unsub();

      // 1. Fresh in-memory cache
      if (current.models.length > 0 && Date.now() - current.lastFetchTime < MEMORY_CACHE_DURATION) {
        return current.models;
      }

      // 2. Persisted DB cache (survives reloads)
      const persisted = await readPersisted();
      if (persisted?.models?.length > 0) {
        set({ models: persisted.models, loading: false, lastFetchTime: Date.now(), error: null });
        return persisted.models;
      }

      // 3. No cache yet — do a one-time live fetch if we have a key
      if (apiKey) {
        const fetched = await this.refresh(apiKey);
        if (fetched.length > 0) return fetched;
      }

      // 4. Fallback list bundled with the app
      set({ models: fallbackModels, loading: false, lastFetchTime: Date.now(), error: null });
      return fallbackModels;
    },

    /**
     * Force a live fetch from OpenRouter and persist the result. This is what
     * the "refresh models" button in Settings calls.
     * @param {string} apiKey
     */
    async refresh(apiKey) {
      if (!apiKey) {
        update(s => ({ ...s, error: 'API Key لازم است' }));
        return [];
      }
      update(s => ({ ...s, loading: true, error: null }));
      try {
        const rawModels = await openrouterService.getAvailableModels(apiKey);
        if (!rawModels || rawModels.length === 0) {
          update(s => ({ ...s, loading: false, error: 'لیستی دریافت نشد' }));
          return [];
        }
        const models = filterTextModels(rawModels).map(normalizeRawModel);
        models.sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));
        await writePersisted(models);
        set({ models, loading: false, lastFetchTime: Date.now(), error: null });
        return models;
      } catch (e) {
        console.error('Failed to refresh models from OpenRouter:', e);
        update(s => ({ ...s, loading: false, error: String(e) }));
        return [];
      }
    },

    /** Last time the persisted catalogue was updated (ISO string) or null. */
    async getLastUpdated() {
      const persisted = await readPersisted();
      return persisted?.updatedAt || null;
    },

    clearCache() {
      update(s => ({ ...s, models: [], lastFetchTime: 0 }));
      db.table('modelCache').delete(CACHE_ID).catch(() => {});
    }
  };
}

export const modelsStore = createModelsStore();

// Backward-compat: keep the old function exports so existing pages don't break
export async function fetchModels(apiKey) {
  return modelsStore.fetch(apiKey);
}

export async function refreshModels(apiKey) {
  return modelsStore.refresh(apiKey);
}

export function clearModelCache() {
  modelsStore.clearCache();
}

export default modelsStore;
