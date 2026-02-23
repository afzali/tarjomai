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
	import { Input } from '$lib/components/ui-rtl/input';
	import { Label } from '$lib/components/ui-rtl/label';
	import * as Select from '$lib/components/ui-rtl/select';
	import { allModels as fallbackModels, getModelsByProvider, getModelName } from '$lib/models.js';
	import { fetchModels } from '$lib/stores/models.store.js';

	let projectId = $derived($page.params.id);
	let project = $state(null);
	let rules = $state(null);
	let settings = $state(null);
	let sampleText = $state('');
	let comparing = $state(false);
	let results = $state([]);

	// Dynamic model list from OpenRouter API
	let availableModels = $state(fallbackModels);
	let loadingModels = $state(false);
	let modelSearchQuery = $state('');

	// Filtered models based on search
	const filteredModels = $derived(
		modelSearchQuery.trim()
			? availableModels.filter(m =>
				m.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
				m.id.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
				m.provider.toLowerCase().includes(modelSearchQuery.toLowerCase())
			)
			: availableModels
	);

	// Group models by provider for display
	const modelsByProvider = $derived(getModelsByProvider(filteredModels));

	let selectedModels = $state(['anthropic/claude-sonnet-4', 'openai/gpt-4.1']);

	// Manual translation entries
	let manualTranslations = $state([]);
	let newManualTitle = $state('');
	let newManualText = $state('');
	let showManualForm = $state(false);
	let judgeSearchQuery = $state('');

	const filteredJudgeModels = $derived(
		judgeSearchQuery.trim()
			? availableModels.filter(m =>
				m.name.toLowerCase().includes(judgeSearchQuery.toLowerCase()) ||
				m.id.toLowerCase().includes(judgeSearchQuery.toLowerCase()) ||
				m.provider.toLowerCase().includes(judgeSearchQuery.toLowerCase())
			)
			: availableModels
	);

	// Judge feature
	let judgeModel = $state('anthropic/claude-sonnet-4');
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
				if (savedData.manualTranslations) manualTranslations = savedData.manualTranslations;
			}
		}
		settings = await settingsStore.load();

		// Fetch models from OpenRouter API
		if (settings?.openRouterApiKey) {
			loadingModels = true;
			try {
				const fetched = await fetchModels(settings.openRouterApiKey);
				if (fetched.length > 0) availableModels = fetched;
			} finally {
				loadingModels = false;
			}
		}
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
				[{ role: 'user', content: prompt }],
				{ temperature: 0, seed: 42, top_p: 1 }
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

	function setManualRating(index, rating) {
		manualTranslations[index].rating = rating;
		manualTranslations = [...manualTranslations];
		projectsService.saveWizardStepData(parseInt(projectId), 'compare', { manualTranslations });
	}

	function addManualTranslation() {
		if (!newManualTitle.trim() || !newManualText.trim()) return;
		manualTranslations = [...manualTranslations, {
			id: `manual-${Date.now()}`,
			modelId: `manual-${Date.now()}`,
			modelName: newManualTitle.trim(),
			translation: newManualText.trim(),
			error: null,
			rating: 0,
			isManual: true
		}];
		newManualTitle = '';
		newManualText = '';
		showManualForm = false;
		projectsService.saveWizardStepData(parseInt(projectId), 'compare', { manualTranslations });
	}

	function removeManualTranslation(index) {
		manualTranslations = manualTranslations.filter((_, i) => i !== index);
		projectsService.saveWizardStepData(parseInt(projectId), 'compare', { manualTranslations });
	}

	function selectModel(modelId) {
		// Update default model for project
		projectsService.updateProject(parseInt(projectId), { defaultModel: modelId });
		goto(`/projects/${projectId}/select-model?model=${encodeURIComponent(modelId)}`);
	}

	// Combine AI results and manual translations for judging
	const allTranslationsForJudge = $derived(
		[...results.filter(r => r.translation && !r.error), ...manualTranslations.filter(m => m.translation)]
	);

	async function judgeTranslations() {
		if (allTranslationsForJudge.length < 2) return;

		judging = true;
		judgeResults = null;

		const translationsText = allTranslationsForJudge.map((r, i) => 
			`[${i + 1}] ${r.isManual ? 'Manual' : 'Model'}: ${r.modelName}\nTranslation: ${r.translation}`
		).join('\n\n');

		const finalPrompt = judgePrompt
			.replace('{sourceText}', sampleText)
			.replace('{sourceLanguage}', project?.sourceLanguage || 'English')
			.replace('{targetLanguage}', project?.targetLanguage || 'Persian')
			.replace('{translations}', translationsText);

		const result = await openrouterService.sendMessage(
			settings.openRouterApiKey,
			judgeModel,
			[{ role: 'user', content: finalPrompt }],
			{ max_tokens: 8192 }
		);

		if (result.success) {
			try {
				let jsonContent = result.content.trim();
				
				// Extract JSON from markdown code blocks (```json ... ``` or ``` ... ```)
				const codeBlockMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
				if (codeBlockMatch) {
					jsonContent = codeBlockMatch[1].trim();
				}
				
				// If no code block found, try to find JSON object directly
				if (!jsonContent.startsWith('{')) {
					const jsonStart = jsonContent.indexOf('{');
					if (jsonStart !== -1) {
						jsonContent = jsonContent.substring(jsonStart);
					}
				}
				
				// Fix truncated JSON: ensure proper closing
				if (!jsonContent.endsWith('}')) {
					// Try to find the last complete evaluation entry and close the JSON
					const lastCompleteEval = jsonContent.lastIndexOf('}');
					if (lastCompleteEval !== -1) {
						jsonContent = jsonContent.substring(0, lastCompleteEval + 1);
						// Count unclosed brackets and braces
						const openBraces = (jsonContent.match(/{/g) || []).length;
						const closeBraces = (jsonContent.match(/}/g) || []).length;
						const openBrackets = (jsonContent.match(/\[/g) || []).length;
						const closeBrackets = (jsonContent.match(/]/g) || []).length;
						jsonContent += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
						jsonContent += '}'.repeat(Math.max(0, openBraces - closeBraces));
					}
				}
				
				const parsed = JSON.parse(jsonContent);
				judgeResults = parsed;

				// Apply ratings from judge to all translations (AI + manual)
				if (parsed.evaluations) {
					const validAiResults = results.filter(r => r.translation && !r.error);
					const validManual = manualTranslations.filter(m => m.translation);
					let evalIdx = 0;

					// Apply to AI results
					for (let i = 0; i < results.length; i++) {
						if (results[i].translation && !results[i].error && evalIdx < parsed.evaluations.length) {
							results[i].rating = parsed.evaluations[evalIdx].rating || 0;
							results[i].strengths = parsed.evaluations[evalIdx].strengths || [];
							results[i].weaknesses = parsed.evaluations[evalIdx].weaknesses || [];
							evalIdx++;
						}
					}
					results = [...results];

					// Apply to manual translations
					for (let i = 0; i < manualTranslations.length; i++) {
						if (manualTranslations[i].translation && evalIdx < parsed.evaluations.length) {
							manualTranslations[i].rating = parsed.evaluations[evalIdx].rating || 0;
							manualTranslations[i].strengths = parsed.evaluations[evalIdx].strengths || [];
							manualTranslations[i].weaknesses = parsed.evaluations[evalIdx].weaknesses || [];
							evalIdx++;
						}
					}
					manualTranslations = [...manualTranslations];
				}
				
				// Save all data
				await projectsService.saveWizardStepData(parseInt(projectId), 'compare', { 
					results, 
					judgeResults: parsed,
					manualTranslations
				});

			} catch (e) {
				console.error('JSON Parse Error:', e);
				console.error('Raw content:', result.content);
				judgeResults = { 
					error: `خطا در پردازش نتیجه داوری: ${e.message}. احتمالاً پاسخ مدل بریده شده یا فرمت JSON نامعتبر است. لطفاً دوباره تلاش کنید یا مدل داور را تغییر دهید.`, 
					raw: result.content 
				};
			}
		} else {
			judgeResults = { error: result.error };
		}

		judging = false;
	}

	const judgeModelName = $derived(getModelName(judgeModel));
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
				<div class="flex items-center justify-between">
					<Label>
						انتخاب مدل‌ها ({selectedModels.length} انتخاب شده از {availableModels.length} مدل)
						{#if loadingModels}
							<span class="text-xs text-muted-foreground mr-2">در حال دریافت لیست مدل‌ها...</span>
						{/if}
					</Label>
					{#if selectedModels.length > 0}
						<button class="text-xs text-destructive hover:underline" onclick={() => selectedModels = []}>
							پاک کردن انتخاب‌ها
						</button>
					{/if}
				</div>

				<Input
					bind:value={modelSearchQuery}
					placeholder="جستجوی مدل... (نام، شناسه یا ارائه‌دهنده)"
					dir="auto"
					class="mb-2"
				/>

				<div class="max-h-[400px] overflow-y-auto space-y-2 border rounded-lg p-2">
					{#each Object.entries(modelsByProvider) as [provider, models]}
						<div class="border rounded-lg p-3">
							<h4 class="font-medium text-sm mb-2">{provider} ({models.length})</h4>
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
					{#if Object.keys(modelsByProvider).length === 0 && modelSearchQuery.trim()}
						<p class="text-sm text-muted-foreground text-center py-4">مدلی با این عبارت پیدا نشد</p>
					{/if}
				</div>
			</div>

			<Button onclick={compareModels} disabled={comparing || !sampleText.trim() || selectedModels.length === 0}>
				{comparing ? 'در حال مقایسه...' : 'شروع مقایسه'}
			</Button>
		</CardContent>
	</Card>

	<!-- Manual Translation Entry Section -->
	<Card class="mb-6">
		<CardHeader>
			<div class="flex items-center justify-between">
				<div>
					<CardTitle>✏️ ترجمه‌های دستی</CardTitle>
					<CardDescription>نمونه ترجمه‌های دستی (مثلاً ترجمه مترجم فعلی) را اضافه کنید تا در مقایسه و داوری شرکت کنند</CardDescription>
				</div>
				<Button variant="outline" onclick={() => showManualForm = !showManualForm}>
					{showManualForm ? 'بستن' : '+ افزودن ترجمه دستی'}
				</Button>
			</div>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if showManualForm}
				<div class="border rounded-lg p-4 space-y-3 bg-muted/30">
					<div class="space-y-2">
						<Label>عنوان / نام مترجم</Label>
						<Input 
							bind:value={newManualTitle}
							placeholder="مثال: ترجمه مترجم فعلی، ترجمه ناشر، ..."
							dir="auto"
						/>
					</div>
					<div class="space-y-2">
						<Label>متن ترجمه</Label>
						<Textarea 
							bind:value={newManualText}
							rows={4}
							placeholder="متن ترجمه را اینجا وارد کنید..."
							dir="auto"
						/>
					</div>
					<div class="flex gap-2">
						<Button onclick={addManualTranslation} disabled={!newManualTitle.trim() || !newManualText.trim()}>
							ذخیره ترجمه
						</Button>
						<Button variant="outline" onclick={() => { showManualForm = false; newManualTitle = ''; newManualText = ''; }}>
							انصراف
						</Button>
					</div>
				</div>
			{/if}

			{#if manualTranslations.length > 0}
				<div class="space-y-2">
					{#each manualTranslations as manual, index}
						<div class="flex items-start gap-3 p-3 border rounded-lg bg-background">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1">
									<span class="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">دستی</span>
									<span class="font-medium text-sm">{manual.modelName}</span>
								</div>
								<p class="text-sm text-muted-foreground truncate" dir="auto">{manual.translation}</p>
							</div>
							<button 
								class="text-destructive hover:bg-destructive/10 p-1 rounded shrink-0"
								onclick={() => removeManualTranslation(index)}
								title="حذف"
							>
								🗑️
							</button>
						</div>
					{/each}
				</div>
			{:else if !showManualForm}
				<p class="text-sm text-muted-foreground text-center py-2">هنوز ترجمه دستی اضافه نشده است</p>
			{/if}
		</CardContent>
	</Card>

	{#if results.length > 0 || manualTranslations.length > 0}
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
					<div class="flex-1 min-w-[200px] space-y-2">
						<Label class="mb-2 block">مدل داور</Label>
						<Input
							bind:value={judgeSearchQuery}
							placeholder="جستجوی مدل داور..."
							dir="auto"
						/>
						<Select.Root type="single" value={judgeModel} onValueChange={(v) => judgeModel = v}>
							<Select.Trigger class="w-full">
								{judgeModelName}
							</Select.Trigger>
							<Select.Content class="max-h-[300px] overflow-y-auto">
								{#each filteredJudgeModels as model}
									<Select.Item value={model.id} label={model.name}>{model.name}</Select.Item>
								{/each}
								{#if filteredJudgeModels.length === 0 && judgeSearchQuery.trim()}
									<div class="p-2 text-sm text-muted-foreground text-center">مدلی پیدا نشد</div>
								{/if}
							</Select.Content>
						</Select.Root>
					</div>
					<Button onclick={judgeTranslations} disabled={judging || allTranslationsForJudge.length < 2}>
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
									پیشنهاد: {getModelName(judgeResults.recommendation) !== judgeResults.recommendation ? getModelName(judgeResults.recommendation) : (manualTranslations.find(m => m.modelId === judgeResults.recommendation)?.modelName || judgeResults.recommendation)}
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
							<div class="flex items-center gap-2">
								<span class="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">AI</span>
								{#if judgeResults?.recommendation === result.modelId}
									<span class="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
										پیشنهاد داور
									</span>
								{/if}
							</div>
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

			<!-- Manual Translation Cards -->
			{#each manualTranslations as manual, index}
				<Card class="border-blue-200 dark:border-blue-800 {judgeResults?.recommendation === manual.modelId ? 'ring-2 ring-green-500' : ''}">
					<CardHeader class="pb-2">
						<div class="flex items-center justify-between">
							<CardTitle class="text-lg">{manual.modelName}</CardTitle>
							<div class="flex items-center gap-2">
								<span class="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">دستی</span>
								{#if judgeResults?.recommendation === manual.modelId}
									<span class="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
										پیشنهاد داور
									</span>
								{/if}
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<p class="text-sm whitespace-pre-wrap" dir="auto">{manual.translation}</p>
						
						<!-- Strengths & Weaknesses from Judge -->
						{#if manual.strengths?.length > 0 || manual.weaknesses?.length > 0}
							<div class="mt-4 space-y-2">
								{#if manual.strengths?.length > 0}
									<div class="text-sm">
										<span class="font-medium text-green-600 dark:text-green-400">نقاط قوت:</span>
										<ul class="list-disc list-inside mr-2 text-muted-foreground">
											{#each manual.strengths as strength}
												<li>{strength}</li>
											{/each}
										</ul>
									</div>
								{/if}
								{#if manual.weaknesses?.length > 0}
									<div class="text-sm">
										<span class="font-medium text-red-600 dark:text-red-400">نقاط ضعف:</span>
										<ul class="list-disc list-inside mr-2 text-muted-foreground">
											{#each manual.weaknesses as weakness}
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
									class="text-xl {manual.rating >= star ? 'text-yellow-500' : 'text-gray-300'}"
									onclick={() => setManualRating(index, star)}
								>
									★
								</button>
							{/each}
						</div>
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
