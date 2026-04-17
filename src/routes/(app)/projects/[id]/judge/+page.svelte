<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { projectsService } from '$lib/services/projects.service.js';
	import { currentProjectStore } from '$lib/stores/currentProject.store.js';
	import { settingsStore } from '$lib/stores/settings.store.js';
	import { openrouterService } from '$lib/services/openrouter.service.js';
	import WizardShell from '$lib/components/tarjomai/wizard-shell.svelte';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui-rtl/card';
	import { Input } from '$lib/components/ui-rtl/input';
	import { Label } from '$lib/components/ui-rtl/label';
	import { Textarea } from '$lib/components/ui-rtl/textarea';
	import * as Select from '$lib/components/ui-rtl/select';
	import { allModels as fallbackModels, getModelName } from '$lib/models.js';
	import { fetchModels } from '$lib/stores/models.store.js';

	let projectId = $derived($page.params.id);
	let project = $state(null);
	let settings = $state(null);
	let loading = $state(true);
	let saving = $state(false);

	// Wizard steps
	const steps = [
		{ id: 'analyze', label: 'تحلیل سبک', description: 'تحلیل سبک نگارش متن' },
		{ id: 'compare', label: 'مقایسه مدل‌ها', description: 'مقایسه خروجی مدل‌های مختلف' },
		{ id: 'judge', label: 'داوری', description: 'ارزیابی و انتخاب نهایی' }
	];
	let currentStepIndex = $state(2); // Judge is step 2 (0: analyze, 1: compare, 2: judge)

	// Load data from previous steps
	let sampleText = $state('');
	let results = $state([]);
	let manualTranslations = $state([]);
	let judgeResults = $state(null);
	let selectedWinner = $state(null); // { type: 'ai' | 'manual', index: number, modelId: string }

	// Manual translation entries
	let newManualTitle = $state('');
	let newManualText = $state('');
	let showManualForm = $state(false);

	// Judge feature
	let availableModels = $state(fallbackModels);
	let loadingModels = $state(false);
	let judgeSearchQuery = $state('');
	let judgeModel = $state('anthropic/claude-sonnet-4');
	let judging = $state(false);
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
	let judgeStatus = $state('idle'); // 'idle' | 'loading' | 'success' | 'error'
	let judgeError = $state('');

	// Final model selection
	let selectedFinalModel = $state('');
	let finalModelSearchQuery = $state('');

	const filteredJudgeModels = $derived(
		judgeSearchQuery.trim()
			? availableModels.filter(m =>
				m.name.toLowerCase().includes(judgeSearchQuery.toLowerCase()) ||
				m.id.toLowerCase().includes(judgeSearchQuery.toLowerCase()) ||
				m.provider.toLowerCase().includes(judgeSearchQuery.toLowerCase())
			)
			: availableModels
	);

	const filteredFinalModels = $derived(
		finalModelSearchQuery.trim()
			? availableModels.filter(m =>
				m.name.toLowerCase().includes(finalModelSearchQuery.toLowerCase()) ||
				m.id.toLowerCase().includes(finalModelSearchQuery.toLowerCase()) ||
				m.provider.toLowerCase().includes(finalModelSearchQuery.toLowerCase())
			)
			: availableModels
	);

	const judgeModelName = $derived(getModelName(judgeModel));
	const finalModelName = $derived(selectedFinalModel ? getModelName(selectedFinalModel) : 'انتخاب نشده');

	onMount(async () => {
		const data = await currentProjectStore.load(parseInt(projectId));
		if (data) {
			project = data.project;
			
			// Load saved comparison data from previous step
			const savedData = await projectsService.getWizardStepData(parseInt(projectId), 'compare');
			if (savedData) {
				if (savedData.sampleText) sampleText = savedData.sampleText;
				if (savedData.results) results = savedData.results;
				if (savedData.manualTranslations) manualTranslations = savedData.manualTranslations;
			}

			// Load judge data if exists
			const judgeData = await projectsService.getWizardStepData(parseInt(projectId), 'judge');
			if (judgeData) {
				if (judgeData.manualTranslations) manualTranslations = judgeData.manualTranslations;
				if (judgeData.judgeResults) judgeResults = judgeData.judgeResults;
				if (judgeData.selectedFinalModel) selectedFinalModel = judgeData.selectedFinalModel;
				if (judgeData.selectedWinner) selectedWinner = judgeData.selectedWinner;
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

		loading = false;
	});

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
		saveJudgeData();
	}

	function removeManualTranslation(index) {
		manualTranslations = manualTranslations.filter((_, i) => i !== index);
		saveJudgeData();
	}

	function setManualRating(index, rating) {
		manualTranslations[index].rating = rating;
		manualTranslations = [...manualTranslations];
		saveJudgeData();
	}

	async function saveJudgeData() {
		await projectsService.saveWizardStepData(parseInt(projectId), 'judge', {
			manualTranslations,
			judgeResults,
			selectedFinalModel,
			selectedWinner
		});
	}

	function setWinner(type, index, modelId) {
		selectedWinner = { type, index, modelId };
		// If AI winner, also set it as the final selected model
		if (type === 'ai' && modelId) {
			selectedFinalModel = modelId;
		}
		saveJudgeData();
	}

	// Combine AI results and manual translations for judging
	const allTranslationsForJudge = $derived(
		[...results.filter(r => r.translation && !r.error), ...manualTranslations.filter(m => m.translation)]
	);

	async function judgeTranslations() {
		if (allTranslationsForJudge.length < 2) return;

		judging = true;
		judgeResults = null;
		judgeStatus = 'loading';
		judgeError = '';

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
			judgeStatus = 'success';
			try {
				let jsonContent = result.content.trim();
				
				// Extract JSON from markdown code blocks
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
				
				// Fix truncated JSON
				if (!jsonContent.endsWith('}')) {
					const lastCompleteEval = jsonContent.lastIndexOf('}');
					if (lastCompleteEval !== -1) {
						jsonContent = jsonContent.substring(0, lastCompleteEval + 1);
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

				// Apply ratings from judge to all translations
				if (parsed.evaluations) {
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
				await saveJudgeData();

			} catch (e) {
				console.error('JSON Parse Error:', e);
				console.error('Raw content:', result.content);
				judgeStatus = 'error';
				judgeError = `خطا در پردازش نتیجه داوری: ${e.message}`;
				judgeResults = { 
					error: `خطا در پردازش نتیجه داوری: ${e.message}. احتمالاً پاسخ مدل بریده شده یا فرمت JSON نامعتبر است.`, 
					raw: result.content 
				};
			}
		} else {
			judgeStatus = 'error';
			judgeError = result.error;
			judgeResults = { error: result.error };
		}

		judging = false;
	}

	function selectRecommendedModel() {
		if (judgeResults?.recommendation) {
			selectedFinalModel = judgeResults.recommendation;
		}
	}

	async function handleFinish() {
		saving = true;
		
		// Save final model selection
		if (selectedFinalModel) {
			await currentProjectStore.updateProject({
				defaultModel: selectedFinalModel
			});
		}

		// Save judge data
		await saveJudgeData();

		// Mark setup as completed
		await projectsService.updateSetupStep(parseInt(projectId), 'completed');
		
		// Go to workspace
		goto(`/projects/${projectId}`);
	}

	function handleBack() {
		goto(`/projects/${projectId}/compare`);
	}

	const canProceed = $derived(selectedFinalModel !== '');
</script>

<WizardShell
	{steps}
	{currentStepIndex}
	projectTitle={project?.title}
	operationType="translation"
	{saving}
	{canProceed}
	finishLabel="شروع کار"
	onBack={handleBack}
	onFinish={handleFinish}
>
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
		</div>
	{:else}
		<div class="space-y-6" dir="rtl">
			<!-- Sample Text Display (Read-only from previous step) -->
			{#if sampleText}
				<Card>
					<CardHeader>
						<CardTitle class="text-base">متن نمونه</CardTitle>
					</CardHeader>
					<CardContent>
						<p class="text-sm text-muted-foreground whitespace-pre-wrap">{sampleText}</p>
					</CardContent>
				</Card>
			{/if}

			<!-- AI Translations with Judge Results -->
			{#if results.length > 0}
				<Card>
					<CardHeader>
						<CardTitle class="text-base">ترجمه‌های AI - نتایج داوری</CardTitle>
						<CardDescription>نقاط قوت و ضعف توسط AI داور تحلیل شده است</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						{#each results.filter(r => r.translation && !r.error) as result, index}
							{@const evaluation = judgeResults?.evaluations?.[index]}
							{@const isWinner = selectedWinner?.type === 'ai' && selectedWinner?.index === index}
							<div class="p-4 border rounded-lg {isWinner ? 'ring-2 ring-green-500 border-green-500 bg-green-50/50 dark:bg-green-950/20' : ''}">
								<div class="flex items-center justify-between mb-3">
									<div class="flex items-center gap-2">
										<span class="font-medium">{result.modelName}</span>
										<span class="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">AI</span>
										{#if isWinner}
											<span class="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">🏆 برنده</span>
										{/if}
									</div>
									<Button 
										variant={isWinner ? 'default' : 'outline'}
										size="sm"
										onclick={() => setWinner('ai', index, result.modelId)}
									>
										{isWinner ? '✓ برنده' : 'انتخاب برنده'}
									</Button>
								</div>
								
								<p class="text-sm whitespace-pre-wrap mb-3" dir="auto">{result.translation}</p>
								
								{#if evaluation}
									<div class="space-y-2 text-sm">
										{#if evaluation.strengths && evaluation.strengths.length > 0}
											<div class="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded p-2">
												<p class="text-green-700 dark:text-green-300 font-medium text-xs mb-1">✓ نقاط قوت (AI)</p>
												<ul class="list-disc list-inside text-green-600 dark:text-green-400 text-xs space-y-0.5">
													{#each evaluation.strengths as strength}
														<li>{strength}</li>
													{/each}
												</ul>
											</div>
										{/if}
										
										{#if evaluation.weaknesses && evaluation.weaknesses.length > 0}
											<div class="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-2">
												<p class="text-red-700 dark:text-red-300 font-medium text-xs mb-1">✗ نقاط ضعف (AI)</p>
												<ul class="list-disc list-inside text-red-600 dark:text-red-400 text-xs space-y-0.5">
													{#each evaluation.weaknesses as weakness}
														<li>{weakness}</li>
													{/each}
												</ul>
											</div>
										{/if}
										
										{#if evaluation.rating > 0}
											<div class="text-amber-500 text-sm">{'⭐'.repeat(evaluation.rating)}</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</CardContent>
				</Card>
			{/if}

			<!-- Manual Translation Entry Section -->
			<Card>
				<CardHeader>
					<div class="flex items-center justify-between">
						<div>
							<CardTitle>✏️ ترجمه‌های دستی</CardTitle>
							<CardDescription>نمونه ترجمه‌های دستی را اضافه کنید تا در داوری شرکت کنند</CardDescription>
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
						<div class="space-y-4">
							{#each manualTranslations as manual, index}
								{@const aiIndex = results.filter(r => r.translation && !r.error).length + index}
								{@const evaluation = judgeResults?.evaluations?.[aiIndex]}
								{@const isWinner = selectedWinner?.type === 'manual' && selectedWinner?.index === index}
								<div class="p-4 border rounded-lg {isWinner ? 'ring-2 ring-green-500 border-green-500 bg-green-50/50 dark:bg-green-950/20' : 'bg-background'}">
									<div class="flex items-center justify-between mb-3">
										<div class="flex items-center gap-2">
											<span class="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">دستی</span>
											<span class="font-medium">{manual.modelName}</span>
											{#if isWinner}
												<span class="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">🏆 برنده</span>
											{/if}
										</div>
										<div class="flex items-center gap-2">
											<Button 
												variant={isWinner ? 'default' : 'outline'}
												size="sm"
												onclick={() => setWinner('manual', index, manual.modelId)}
											>
												{isWinner ? '✓ برنده' : 'انتخاب برنده'}
											</Button>
											<button 
												class="text-destructive hover:bg-destructive/10 p-1 rounded shrink-0"
												onclick={() => removeManualTranslation(index)}
												title="حذف"
											>
												🗑️
											</button>
										</div>
									</div>
									
									<p class="text-sm whitespace-pre-wrap mb-3" dir="auto">{manual.translation}</p>
									
									{#if evaluation}
										<div class="space-y-2 text-sm">
											{#if evaluation.strengths && evaluation.strengths.length > 0}
												<div class="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded p-2">
													<p class="text-green-700 dark:text-green-300 font-medium text-xs mb-1">✓ نقاط قوت (AI)</p>
													<ul class="list-disc list-inside text-green-600 dark:text-green-400 text-xs space-y-0.5">
														{#each evaluation.strengths as strength}
															<li>{strength}</li>
														{/each}
													</ul>
												</div>
											{/if}
											
											{#if evaluation.weaknesses && evaluation.weaknesses.length > 0}
												<div class="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-2">
													<p class="text-red-700 dark:text-red-300 font-medium text-xs mb-1">✗ نقاط ضعف (AI)</p>
													<ul class="list-disc list-inside text-red-600 dark:text-red-400 text-xs space-y-0.5">
														{#each evaluation.weaknesses as weakness}
															<li>{weakness}</li>
														{/each}
													</ul>
												</div>
											{/if}
											
											{#if evaluation.rating > 0}
												<div class="text-amber-500 text-sm">{'⭐'.repeat(evaluation.rating)}</div>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{:else if !showManualForm}
						<p class="text-sm text-muted-foreground text-center py-2">هنوز ترجمه دستی اضافه نشده است</p>
					{/if}
				</CardContent>
			</Card>

			<!-- Judge Section -->
			<Card>
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
							<Select.Root type="single" value={judgeModel} onValueChange={(v) => judgeModel = v}>
								<Select.Trigger class="w-full">
									{judgeModelName}
								</Select.Trigger>
								<Select.Content class="max-h-[300px] overflow-y-auto">
									<!-- Search input inside dropdown (combobox pattern) -->
									<div class="p-2 border-b sticky top-0 bg-background z-10">
										<Input
											bind:value={judgeSearchQuery}
											placeholder="جستجوی مدل داور..."
											dir="auto"
											class="h-8 text-sm"
										/>
									</div>
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

					{#if judgeStatus !== 'idle'}
						<div class="mt-3 flex items-center gap-2 text-sm p-3 rounded-lg border {judgeStatus === 'loading' ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' : judgeStatus === 'success' ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'}">
							{#if judgeStatus === 'loading'}
								<span class="animate-spin">⏳</span>
								<span>در حال ارسال به مدل داور ({judgeModelName})...</span>
							{:else if judgeStatus === 'success'}
								<span>✅</span>
								<span class="text-green-700 dark:text-green-300">داوری با موفقیت انجام شد</span>
							{:else if judgeStatus === 'error'}
								<span>❌</span>
								<span class="text-red-700 dark:text-red-300">خطا در داوری: {judgeError}</span>
							{/if}
						</div>
					{/if}

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
									<Button 
										size="sm" 
										variant="outline" 
										class="mt-3"
										onclick={selectRecommendedModel}
									>
										انتخاب مدل پیشنهادی
									</Button>
								{/if}
							</div>
						{/if}
					{/if}
				</CardContent>
			</Card>

			<!-- Final Model Selection -->
			<Card>
				<CardHeader>
					<CardTitle>🎯 انتخاب مدل نهایی</CardTitle>
					<CardDescription>مدل نهایی برای ترجمه پروژه را انتخاب کنید</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="space-y-2">
						<Label>مدل انتخاب‌شده</Label>
						<Select.Root type="single" value={selectedFinalModel} onValueChange={(v) => { selectedFinalModel = v; saveJudgeData(); }}>
							<Select.Trigger class="w-full">
								{finalModelName}
							</Select.Trigger>
							<Select.Content class="max-h-[300px] overflow-y-auto">
								<!-- Search input inside dropdown (combobox pattern) -->
								<div class="p-2 border-b sticky top-0 bg-background z-10">
									<Input
										bind:value={finalModelSearchQuery}
										placeholder="جستجوی مدل..."
										dir="auto"
										class="h-8 text-sm"
									/>
								</div>
								{#each filteredFinalModels as model}
									<Select.Item value={model.id} label={model.name}>{model.name}</Select.Item>
								{/each}
								{#if filteredFinalModels.length === 0 && finalModelSearchQuery.trim()}
									<div class="p-2 text-sm text-muted-foreground text-center">مدلی پیدا نشد</div>
								{/if}
							</Select.Content>
						</Select.Root>
					</div>
					{#if selectedFinalModel}
						<div class="p-3 bg-primary/10 rounded-lg border border-primary">
							<p class="text-sm font-medium">{finalModelName}</p>
							<p class="text-xs text-muted-foreground mt-1">
								این مدل برای ترجمه تمام فصل‌های پروژه استفاده خواهد شد
							</p>
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>
	{/if}
</WizardShell>
