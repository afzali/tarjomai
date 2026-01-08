<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { currentProjectStore } from '$lib/stores/currentProject.store.js';
	import { settingsStore } from '$lib/stores/settings.store.js';
	import { openrouterService } from '$lib/services/openrouter.service.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui-rtl/card';
	import { Checkbox } from '$lib/components/ui-rtl/checkbox';

	let projectId = $derived($page.params.id);
	let project = $state(null);
	let rules = $state(null);
	let settings = $state(null);
	let sampleText = $state('');
	let comparing = $state(false);
	let results = $state([]);

	const availableModels = [
		{ id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
		{ id: 'openai/gpt-4o', name: 'GPT-4o' },
		{ id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
		{ id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' }
	];

	let selectedModels = $state(['anthropic/claude-3.5-sonnet', 'openai/gpt-4o']);

	onMount(async () => {
		const data = await currentProjectStore.load(parseInt(projectId));
		if (data) {
			project = data.project;
			rules = data.rules;
		}
		settings = await settingsStore.load();
	});

	function toggleModel(modelId) {
		if (selectedModels.includes(modelId)) {
			selectedModels = selectedModels.filter(m => m !== modelId);
		} else {
			selectedModels = [...selectedModels, modelId];
		}
	}

	async function compareModels() {
		if (!sampleText.trim() || selectedModels.length === 0) return;
		
		comparing = true;
		results = [];

		const rulesPrompt = rules ? `
Translation rules:
- Tone: ${rules.tone?.join(', ') || 'balanced'}
- Vocabulary Level: ${rules.vocabularyLevel || 'medium'}
- Translation Type: ${rules.translationType || 'balanced'}
${rules.customRules?.length > 0 ? `- Custom Rules: ${rules.customRules.join('; ')}` : ''}
` : '';

		const prompt = `Translate the following text from ${project?.sourceLanguage || 'English'} to ${project?.targetLanguage || 'Persian'}.
${rulesPrompt}
Text to translate:
${sampleText}

Provide only the translation, no explanations.`;

		const promises = selectedModels.map(async (modelId) => {
			const result = await openrouterService.sendMessage(
				settings.openRouterApiKey,
				modelId,
				[{ role: 'user', content: prompt }]
			);
			return {
				modelId,
				modelName: availableModels.find(m => m.id === modelId)?.name || modelId,
				translation: result.success ? result.content : null,
				error: result.success ? null : result.error,
				rating: 0
			};
		});

		results = await Promise.all(promises);
		comparing = false;
	}

	function setRating(index, rating) {
		results[index].rating = rating;
		results = [...results];
	}

	function selectModel(modelId) {
		goto(`/projects/${projectId}/select-model?model=${encodeURIComponent(modelId)}`);
	}
</script>

<div class="container mx-auto py-8 px-4 max-w-6xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold">مقایسه مدل‌ها</h1>
		<p class="text-muted-foreground mt-1">
			چند مدل را امتحان کنید و بهترین را انتخاب کنید
		</p>
	</div>

	<Card class="mb-6">
		<CardHeader>
			<CardTitle>متن نمونه برای مقایسه</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<textarea 
				bind:value={sampleText}
				rows={4}
				class="w-full p-3 border rounded-md resize-none"
				placeholder="یک پاراگراف کوتاه برای مقایسه وارد کنید..."
				dir="auto"
			></textarea>

			<div class="flex flex-wrap gap-4">
				{#each availableModels as model}
					<label class="flex items-center gap-2 cursor-pointer">
						<Checkbox 
							checked={selectedModels.includes(model.id)}
							onCheckedChange={() => toggleModel(model.id)}
						/>
						<span class="text-sm">{model.name}</span>
					</label>
				{/each}
			</div>

			<Button onclick={compareModels} disabled={comparing || !sampleText.trim() || selectedModels.length === 0}>
				{comparing ? 'در حال مقایسه...' : 'شروع مقایسه'}
			</Button>
		</CardContent>
	</Card>

	{#if results.length > 0}
		<div class="grid gap-4 md:grid-cols-2">
			{#each results as result, index}
				<Card>
					<CardHeader class="pb-2">
						<CardTitle class="text-lg">{result.modelName}</CardTitle>
					</CardHeader>
					<CardContent>
						{#if result.error}
							<p class="text-red-600 text-sm">{result.error}</p>
						{:else}
							<p class="text-sm whitespace-pre-wrap" dir="auto">{result.translation}</p>
							
							<div class="mt-4 flex items-center gap-2">
								<span class="text-sm text-muted-foreground">امتیاز:</span>
								{#each [1, 2, 3, 4, 5] as star}
									<button 
										class="text-xl {result.rating >= star ? 'text-yellow-500' : 'text-gray-300'}"
										onclick={() => setRating(index, star)}
									>
										★
									</button>
								{/each}
							</div>

							<Button 
								size="sm" 
								class="mt-4"
								onclick={() => selectModel(result.modelId)}
							>
								انتخاب این مدل
							</Button>
						{/if}
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}

	<div class="mt-6 flex gap-2">
		<Button variant="outline" href="/projects/{projectId}/analyze">
			بازگشت
		</Button>
		<Button variant="outline" href="/projects/{projectId}/quick-setup">
			تنظیم دستی
		</Button>
	</div>
</div>
