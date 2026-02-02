<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { projectsService } from '$lib/services/projects.service.js';
	import { currentProjectStore } from '$lib/stores/currentProject.store.js';
	import { settingsStore } from '$lib/stores/settings.store.js';
	import { openrouterService } from '$lib/services/openrouter.service.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui-rtl/card';
	import { Checkbox } from '$lib/components/ui-rtl/checkbox';
	import { Textarea } from '$lib/components/ui-rtl/textarea';
	import { Label } from '$lib/components/ui-rtl/label';
	import * as Select from '$lib/components/ui-rtl/select';

	let projectId = $derived($page.params.id);
	let project = $state(null);
	let rules = $state(null);
	let settings = $state(null);
	let sampleText = $state('');
	let comparing = $state(false);
	let results = $state([]);

	// Featured models (quick select)
	const featuredModels = [
		{ id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
		{ id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
		{ id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
		{ id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', provider: 'Google' },
		{ id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta' },
		{ id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek' },
		{ id: 'mistralai/mistral-large-latest', name: 'Mistral Large', provider: 'Mistral' }
	];

	// All available models (for multi-select)
	const allModels = [
		// Anthropic
		{ id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
		{ id: 'anthropic/claude-3-5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
		{ id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
		// OpenAI
		{ id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
		{ id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
		{ id: 'openai/o1-preview', name: 'o1 Preview', provider: 'OpenAI' },
		{ id: 'openai/o1-mini', name: 'o1 Mini', provider: 'OpenAI' },
		// Google
		{ id: 'google/gemini-pro-1.5', name: 'Gemini 1.5 Pro', provider: 'Google' },
		{ id: 'google/gemini-flash-1.5', name: 'Gemini 1.5 Flash', provider: 'Google' },
		{ id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', provider: 'Google' },
		// Meta
		{ id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta' },
		{ id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta' },
		{ id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'Meta' },
		// Mistral
		{ id: 'mistralai/mistral-large-latest', name: 'Mistral Large', provider: 'Mistral' },
		{ id: 'mistralai/mistral-small-latest', name: 'Mistral Small', provider: 'Mistral' },
		{ id: 'mistralai/codestral-latest', name: 'Codestral', provider: 'Mistral' },
		// DeepSeek
		{ id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek' },
		{ id: 'deepseek/deepseek-reasoner', name: 'DeepSeek R1', provider: 'DeepSeek' },
		// Qwen
		{ id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', provider: 'Qwen' },
		{ id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B', provider: 'Qwen' }
	];

	// Use allModels for selection
	const availableModels = allModels;

	// Group models by provider for display
	const modelsByProvider = $derived(
		availableModels.reduce((acc, model) => {
			if (!acc[model.provider]) acc[model.provider] = [];
			acc[model.provider].push(model);
			return acc;
		}, {})
	);

	let selectedModels = $state(['anthropic/claude-3.5-sonnet', 'openai/gpt-4o']);

	// Judge feature
	let judgeModel = $state('anthropic/claude-3.5-sonnet');
	let judging = $state(false);
	let judgeResults = $state(null);
	let showJudgePrompt = $state(false);
	let judgePrompt = $state(`You are an expert translation evaluator. Compare the following translations and provide a detailed analysis.

Source text: {sourceText}
Source language: {sourceLanguage}
Target language: {targetLanguage}

Translations to compare:
{translations}

For each translation, provide:
1. Strengths (نقاط قوت)
2. Weaknesses (نقاط ضعف)
3. Overall rating (1-5 stars)

Then provide a final recommendation for the best translation.

Respond in JSON format:
{
  "evaluations": [
    {
      "modelId": "model-id",
      "strengths": ["..."],
      "weaknesses": ["..."],
      "rating": 4
    }
  ],
  "recommendation": "model-id",
  "summary": "Overall analysis summary in Persian"
}`);

	onMount(async () => {
		const data = await currentProjectStore.load(parseInt(projectId));
		if (data) {
			project = data.project;
			rules = data.rules;
			
			// Load saved comparison data
			const savedData = await projectsService.getWizardStepData(parseInt(projectId), 'compare');
			if (savedData) {
				if (savedData.sampleText) sampleText = savedData.sampleText;
				if (savedData.results) results = savedData.results;
				if (savedData.judgeResults) judgeResults = savedData.judgeResults;
			}
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
		judgeResults = null;

		// Save sample text
		await projectsService.saveWizardStepData(parseInt(projectId), 'compare', { sampleText });

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
		
		// Save results
		await projectsService.saveWizardStepData(parseInt(projectId), 'compare', { results });
		
		comparing = false;
	}

	function setRating(index, rating) {
		results[index].rating = rating;
		results = [...results];
		// Save updated ratings
		projectsService.saveWizardStepData(parseInt(projectId), 'compare', { results });
	}

	function selectModel(modelId) {
		// Update default model for project
		projectsService.updateProject(parseInt(projectId), { defaultModel: modelId });
		goto(`/projects/${projectId}/select-model?model=${encodeURIComponent(modelId)}`);
	}

	async function judgeTranslations() {
		const validResults = results.filter(r => r.translation && !r.error);
		if (validResults.length < 2) return;

		judging = true;
		judgeResults = null;

		const translationsText = validResults.map((r, i) => 
			`[${i + 1}] Model: ${r.modelName}\nTranslation: ${r.translation}`
		).join('\n\n');

		const finalPrompt = judgePrompt
			.replace('{sourceText}', sampleText)
			.replace('{sourceLanguage}', project?.sourceLanguage || 'English')
			.replace('{targetLanguage}', project?.targetLanguage || 'Persian')
			.replace('{translations}', translationsText);

		const result = await openrouterService.sendMessage(
			settings.openRouterApiKey,
			judgeModel,
			[{ role: 'user', content: finalPrompt }]
		);

		if (result.success) {
			try {
				let jsonContent = result.content.trim();
				// Remove markdown code blocks if present
				jsonContent = jsonContent.replace(/```json\s*([\s\S]*?)\s*```/g, '$1');
				jsonContent = jsonContent.replace(/```\s*([\s\S]*?)\s*```/g, '$1');
				
				const parsed = JSON.parse(jsonContent);
				judgeResults = parsed;

				// Apply ratings from judge
				if (parsed.evaluations) {
					parsed.evaluations.forEach((evaluation, index) => {
						if (index < results.length) {
							results[index].rating = evaluation.rating || 0;
							results[index].strengths = evaluation.strengths || [];
							results[index].weaknesses = evaluation.weaknesses || [];
						}
					});
					results = [...results];
				}
				
				// Save all data
				await projectsService.saveWizardStepData(parseInt(projectId), 'compare', { 
					results, 
					judgeResults: parsed 
				});

			} catch (e) {
				console.error('JSON Parse Error:', e);
				judgeResults = { error: 'خطا در پردازش نتیجه داوری: ساختار JSON نامعتبر است.', raw: result.content };
			}
		} else {
			judgeResults = { error: result.error };
		}

		judging = false;
	}

	const judgeModelName = $derived(
		availableModels.find(m => m.id === judgeModel)?.name || judgeModel
	);
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
			<CardDescription>یک پاراگراف کوتاه وارد کنید و مدل‌های مورد نظر را انتخاب کنید</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<Textarea 
				bind:value={sampleText}
				rows={4}
				placeholder="یک پاراگراف کوتاه برای مقایسه وارد کنید..."
				dir="auto"
			/>

			<div class="space-y-3">
				<Label>انتخاب مدل‌ها ({selectedModels.length} مدل انتخاب شده)</Label>
				{#each Object.entries(modelsByProvider) as [provider, models]}
					<div class="border rounded-lg p-3">
						<h4 class="font-medium text-sm mb-2">{provider}</h4>
						<div class="flex flex-wrap gap-3">
							{#each models as model}
								<label class="flex items-center gap-2 cursor-pointer">
									<Checkbox 
										checked={selectedModels.includes(model.id)}
										onCheckedChange={() => toggleModel(model.id)}
									/>
									<span class="text-sm">{model.name}</span>
								</label>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			<Button onclick={compareModels} disabled={comparing || !sampleText.trim() || selectedModels.length === 0}>
				{comparing ? 'در حال مقایسه...' : 'شروع مقایسه'}
			</Button>
		</CardContent>
	</Card>

	{#if results.length > 0}
		<!-- Judge Section -->
		<Card class="mb-6">
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					⚖️ داوری با AI
				</CardTitle>
				<CardDescription>یک مدل را به عنوان داور انتخاب کنید تا ترجمه‌ها را ارزیابی کند</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex flex-wrap items-end gap-4">
					<div class="flex-1 min-w-[200px]">
						<Label class="mb-2 block">مدل داور</Label>
						<Select.Root type="single" value={judgeModel} onValueChange={(v) => judgeModel = v}>
							<Select.Trigger class="w-full">
								{judgeModelName}
							</Select.Trigger>
							<Select.Content>
								{#each availableModels as model}
									<Select.Item value={model.id} label={model.name}>{model.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<Button onclick={judgeTranslations} disabled={judging || results.filter(r => r.translation).length < 2}>
						{judging ? 'در حال داوری...' : 'شروع داوری'}
					</Button>
					<Button variant="outline" onclick={() => showJudgePrompt = !showJudgePrompt}>
						{showJudgePrompt ? 'بستن پرامپت' : 'ویرایش پرامپت'}
					</Button>
				</div>

				{#if showJudgePrompt}
					<div class="mt-4">
						<Label class="mb-2 block">پرامپت داوری (قابل ویرایش)</Label>
						<Textarea 
							bind:value={judgePrompt}
							rows={10}
							class="font-mono text-sm"
							dir="ltr"
						/>
						<p class="text-xs text-muted-foreground mt-1">
							متغیرها: {'{sourceText}'}, {'{sourceLanguage}'}, {'{targetLanguage}'}, {'{translations}'}
						</p>
					</div>
				{/if}

				{#if judgeResults}
					{#if judgeResults.error}
						<div class="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
							<p class="text-red-600 dark:text-red-400">{judgeResults.error}</p>
							{#if judgeResults.raw}
								<pre class="mt-2 text-xs overflow-auto">{judgeResults.raw}</pre>
							{/if}
						</div>
					{:else}
						<div class="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
							<h4 class="font-medium text-green-800 dark:text-green-200 mb-2">خلاصه داوری</h4>
							<p class="text-sm text-green-700 dark:text-green-300" dir="auto">{judgeResults.summary}</p>
							{#if judgeResults.recommendation}
								<p class="mt-2 text-sm font-medium text-green-800 dark:text-green-200">
									پیشنهاد: {availableModels.find(m => m.id === judgeResults.recommendation)?.name || judgeResults.recommendation}
								</p>
							{/if}
						</div>
					{/if}
				{/if}
			</CardContent>
		</Card>

		<!-- Results Grid -->
		<div class="grid gap-4 md:grid-cols-2">
			{#each results as result, index}
				<Card class="{judgeResults?.recommendation === result.modelId ? 'ring-2 ring-green-500' : ''}">
					<CardHeader class="pb-2">
						<div class="flex items-center justify-between">
							<CardTitle class="text-lg">{result.modelName}</CardTitle>
							{#if judgeResults?.recommendation === result.modelId}
								<span class="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
									پیشنهاد داور
								</span>
							{/if}
						</div>
					</CardHeader>
					<CardContent>
						{#if result.error}
							<p class="text-red-600 text-sm">{result.error}</p>
						{:else}
							<p class="text-sm whitespace-pre-wrap" dir="auto">{result.translation}</p>
							
							<!-- Strengths & Weaknesses from Judge -->
							{#if result.strengths?.length > 0 || result.weaknesses?.length > 0}
								<div class="mt-4 space-y-2">
									{#if result.strengths?.length > 0}
										<div class="text-sm">
											<span class="font-medium text-green-600 dark:text-green-400">نقاط قوت:</span>
											<ul class="list-disc list-inside mr-2 text-muted-foreground">
												{#each result.strengths as strength}
													<li>{strength}</li>
												{/each}
											</ul>
										</div>
									{/if}
									{#if result.weaknesses?.length > 0}
										<div class="text-sm">
											<span class="font-medium text-red-600 dark:text-red-400">نقاط ضعف:</span>
											<ul class="list-disc list-inside mr-2 text-muted-foreground">
												{#each result.weaknesses as weakness}
													<li>{weakness}</li>
												{/each}
											</ul>
										</div>
									{/if}
								</div>
							{/if}
							
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

	<!-- Wizard Progress -->
	<div class="mt-8 mb-6 flex items-center justify-center gap-2">
		<a 
			href="/projects/{projectId}/analyze"
			class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors bg-muted hover:bg-muted/80 text-muted-foreground"
		>
			<span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-background">1</span>
			<span class="text-sm">تحلیل سبک</span>
		</a>
		<span class="mx-2 text-muted-foreground">→</span>
		<div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground">
			<span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-primary-foreground text-primary">2</span>
			<span class="text-sm">مقایسه مدل‌ها</span>
		</div>
		<span class="mx-2 text-muted-foreground">→</span>
		<a 
			href="/projects/{projectId}"
			class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors bg-muted hover:bg-muted/80 text-muted-foreground"
		>
			<span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-background">3</span>
			<span class="text-sm">فضای کار</span>
		</a>
	</div>

	<div class="flex justify-between">
		<Button variant="outline" href="/projects/{projectId}/analyze">
			← بازگشت به تحلیل سبک
		</Button>
		<Button href="/projects/{projectId}">
			رفتن به فضای کار →
		</Button>
	</div>
</div>
