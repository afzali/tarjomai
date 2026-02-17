// Centralized AI model definitions for OpenRouter
// Last updated: 2026-02-17

export const allModels = [
	// Anthropic
	{ id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
	{ id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
	{ id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
	{ id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },

	// OpenAI
	{ id: 'openai/gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI' },
	{ id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'OpenAI' },
	{ id: 'openai/gpt-4.1-nano', name: 'GPT-4.1 Nano', provider: 'OpenAI' },
	{ id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
	{ id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
	{ id: 'openai/o3', name: 'o3', provider: 'OpenAI' },
	{ id: 'openai/o3-mini', name: 'o3 Mini', provider: 'OpenAI' },
	{ id: 'openai/o4-mini', name: 'o4 Mini', provider: 'OpenAI' },

	// Google
	{ id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro', provider: 'Google' },
	{ id: 'google/gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash', provider: 'Google' },
	{ id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google' },
	{ id: 'google/gemini-2.0-flash-lite-001', name: 'Gemini 2.0 Flash Lite', provider: 'Google' },
	{ id: 'google/gemini-pro-1.5', name: 'Gemini 1.5 Pro', provider: 'Google' },
	{ id: 'google/gemini-flash-1.5', name: 'Gemini 1.5 Flash', provider: 'Google' },

	// Meta (Llama)
	{ id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta' },
	{ id: 'meta-llama/llama-4-scout', name: 'Llama 4 Scout', provider: 'Meta' },
	{ id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta' },
	{ id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', provider: 'Meta' },
	{ id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta' },
	{ id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'Meta' },

	// DeepSeek
	{ id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek V3 (0324)', provider: 'DeepSeek' },
	{ id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek' },
	{ id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek' },

	// Mistral
	{ id: 'mistralai/mistral-large-latest', name: 'Mistral Large', provider: 'Mistral' },
	{ id: 'mistralai/mistral-medium-latest', name: 'Mistral Medium', provider: 'Mistral' },
	{ id: 'mistralai/mistral-small-latest', name: 'Mistral Small', provider: 'Mistral' },
	{ id: 'mistralai/codestral-latest', name: 'Codestral', provider: 'Mistral' },

	// Qwen
	{ id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', provider: 'Qwen' },
	{ id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B', provider: 'Qwen' },
	{ id: 'qwen/qwq-32b', name: 'QwQ 32B', provider: 'Qwen' },

	// Amazon (Nova)
	{ id: 'amazon/nova-pro-v1', name: 'Nova Pro', provider: 'Amazon' },
	{ id: 'amazon/nova-lite-v1', name: 'Nova Lite', provider: 'Amazon' },

	// Cohere
	{ id: 'cohere/command-r-plus', name: 'Command R+', provider: 'Cohere' },
	{ id: 'cohere/command-r', name: 'Command R', provider: 'Cohere' },

	// Microsoft
	{ id: 'microsoft/phi-4', name: 'Phi-4', provider: 'Microsoft' },
	{ id: 'microsoft/mai-ds-r1', name: 'MAI DS R1', provider: 'Microsoft' },
];

// Featured models for quick selection (subset of allModels)
export const featuredModels = [
	{ id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
	{ id: 'openai/gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI' },
	{ id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
	{ id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro', provider: 'Google' },
	{ id: 'google/gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash', provider: 'Google' },
	{ id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek V3 (0324)', provider: 'DeepSeek' },
	{ id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta' },
	{ id: 'mistralai/mistral-large-latest', name: 'Mistral Large', provider: 'Mistral' },
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
