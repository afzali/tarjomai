import { openrouterService } from '$lib/services/openrouter.service.js';
import { allModels as fallbackModels } from '$lib/models.js';

/** @type {{ id: string, name: string, provider: string }[]} */
let cachedModels = [];
let lastFetchTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch text-capable models from OpenRouter API, with fallback to hardcoded list.
 * Filters out image-only, audio-only, and moderation models.
 * @param {string} apiKey
 * @returns {Promise<{ id: string, name: string, provider: string }[]>}
 */
export async function fetchModels(apiKey) {
	if (cachedModels.length > 0 && Date.now() - lastFetchTime < CACHE_DURATION) {
		return cachedModels;
	}

	if (!apiKey) return fallbackModels;

	try {
		const rawModels = await openrouterService.getAvailableModels(apiKey);
		if (!rawModels || rawModels.length === 0) return fallbackModels;

		// Filter: only models that support text completion (have 'text' in modality or no modality specified)
		// Exclude image-generation-only, audio-only, moderation-only models
		const textModels = rawModels.filter((/** @type {any} */ m) => {
			// Skip if explicitly no text support
			const arch = m.architecture;
			if (arch) {
				const modality = arch.modality || '';
				const outputModality = arch.output_modality || modality;
				// Must output text
				if (outputModality && !outputModality.includes('text')) return false;
			}
			// Skip moderation / embedding models
			const id = m.id || '';
			if (id.includes('/moderation') || id.includes('/embedding') || id.includes('/tts') || id.includes('/image')) return false;
			return true;
		});

		cachedModels = textModels.map((/** @type {any} */ m) => {
			const parts = m.id.split('/');
			const provider = parts[0] || 'Unknown';
			// Capitalize provider
			const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
			return {
				id: m.id,
				name: m.name || m.id,
				provider: providerName,
				contextLength: m.context_length || 0,
				pricing: m.pricing || null
			};
		});

		// Sort: by provider then name
		cachedModels.sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));

		lastFetchTime = Date.now();
		return cachedModels;
	} catch (e) {
		console.error('Failed to fetch models from OpenRouter:', e);
		return fallbackModels;
	}
}

/** Clear cached models (e.g. when API key changes) */
export function clearModelCache() {
	cachedModels = [];
	lastFetchTime = 0;
}
