// Centralized AI model definitions for OpenRouter
// Last updated: 2026-06-03
// NOTE: This is only a FALLBACK list shown when the live OpenRouter model list
// can't be fetched (no API key / network error). The app normally fetches the
// up-to-date catalogue at runtime via fetchModels(). When editing, prefer stable
// model slugs that exist on OpenRouter.

export const allModels = [
	// Google (Gemini) — preferred for translation
	{ id: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'Google' },
	{ id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', provider: 'Google' },
	{ id: 'google/gemini-3.5-flash', name: 'Gemini 3.5 Flash', provider: 'Google' },
	{ id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'Google' },
	{ id: 'google/gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', provider: 'Google' },
	{ id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
	{ id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
	{ id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', provider: 'Google' },

	// Anthropic
	{ id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5', provider: 'Anthropic' },
	{ id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'Anthropic' },
	{ id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'Anthropic' },
	{ id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
	{ id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'Anthropic' },
	{ id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic' },

	// OpenAI
	{ id: 'openai/gpt-5.1', name: 'GPT-5.1', provider: 'OpenAI' },
	{ id: 'openai/gpt-5', name: 'GPT-5', provider: 'OpenAI' },
	{ id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', provider: 'OpenAI' },
	{ id: 'openai/gpt-5-nano', name: 'GPT-5 Nano', provider: 'OpenAI' },
	{ id: 'openai/gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI' },
	{ id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'OpenAI' },
	{ id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
	{ id: 'openai/o4-mini', name: 'o4 Mini', provider: 'OpenAI' },

	// Meta (Llama)
	{ id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta' },
	{ id: 'meta-llama/llama-4-scout', name: 'Llama 4 Scout', provider: 'Meta' },
	{ id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta' },

	// DeepSeek
	{ id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'DeepSeek' },
	{ id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek V3 (0324)', provider: 'DeepSeek' },
	{ id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek' },

	// Mistral
	{ id: 'mistralai/mistral-large-latest', name: 'Mistral Large', provider: 'Mistral' },
	{ id: 'mistralai/mistral-medium-latest', name: 'Mistral Medium', provider: 'Mistral' },
	{ id: 'mistralai/mistral-small-latest', name: 'Mistral Small', provider: 'Mistral' },

	// Qwen
	{ id: 'qwen/qwen3-235b-a22b', name: 'Qwen3 235B', provider: 'Qwen' },
	{ id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', provider: 'Qwen' },

	// xAI (Grok)
	{ id: 'x-ai/grok-4', name: 'Grok 4', provider: 'xAI' },
	{ id: 'x-ai/grok-3', name: 'Grok 3', provider: 'xAI' },

	// Amazon (Nova)
	{ id: 'amazon/nova-pro-v1', name: 'Nova Pro', provider: 'Amazon' },
	{ id: 'amazon/nova-lite-v1', name: 'Nova Lite', provider: 'Amazon' },

	// Cohere
	{ id: 'cohere/command-r-plus', name: 'Command R+', provider: 'Cohere' },
	{ id: 'cohere/command-r', name: 'Command R', provider: 'Cohere' },

	// Microsoft
	{ id: 'microsoft/phi-4', name: 'Phi-4', provider: 'Microsoft' },
];

// Featured models for quick selection (subset of allModels)
export const featuredModels = [
	{ id: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'Google' },
	{ id: 'google/gemini-3.5-flash', name: 'Gemini 3.5 Flash', provider: 'Google' },
	{ id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', provider: 'Google' },
	{ id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
	{ id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5', provider: 'Anthropic' },
	{ id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'Anthropic' },
	{ id: 'openai/gpt-5.1', name: 'GPT-5.1', provider: 'OpenAI' },
	{ id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'DeepSeek' },
];

// Group models by provider
/** @param {typeof allModels} [models] */
export function getModelsByProvider(models = allModels) {
	/** @type {Record<string, typeof allModels>} */
	const result = {};
	for (const model of models) {
		if (!result[model.provider]) result[model.provider] = [];
		result[model.provider].push(model);
	}
	return result;
}

// Find model by ID
/** @param {string} modelId */
export function findModel(modelId) {
	return allModels.find(m => m.id === modelId);
}

// Get model name by ID (with fallback)
/** @param {string} modelId */
export function getModelName(modelId) {
	return findModel(modelId)?.name || modelId;
}

// Convert to select-compatible format { value, label }
/** @param {typeof allModels} [models] */
export function modelsToSelectItems(models = allModels) {
	return models.map(m => ({ value: m.id, label: m.name }));
}

// Single source of truth for the app's built-in default model choices.
// Used when the user hasn't set their own defaults in Settings.
export const DEFAULT_MODELS = {
	translation: 'google/gemini-3.1-pro-preview',
	styleAnalysis: 'google/gemini-3.1-pro-preview',
	scoring: 'google/gemini-3.1-pro-preview',
	editorial: 'google/gemini-3.5-flash',
	review: 'google/gemini-3.5-flash'
};

/**
 * Resolve a default model for a given purpose, preferring the user's saved
 * settings and falling back to the built-in defaults.
 * @param {any} settings  the settings object (may be null)
 * @param {keyof typeof DEFAULT_MODELS} purpose
 * @returns {string}
 */
export function resolveDefaultModel(settings, purpose) {
	return settings?.defaultModels?.[purpose] || DEFAULT_MODELS[purpose] || DEFAULT_MODELS.translation;
}
