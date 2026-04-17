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
	let saving = $state(false);

	// Wizard steps
	const steps = [
		{ id: 'analyze', label: 'تحلیل سبک', description: 'تحلیل سبک نگارش متن' },
		{ id: 'compare', label: 'مقایسه مدل‌ها', description: 'مقایسه خروجی مدل‌های مختلف' },
		{ id: 'judge', label: 'داوری', description: 'ارزیابی و انتخاب نهایی' }
	];
	let currentStepIndex = $state(1);

	// Per-model progress tracking: { modelId, status: 'pending'|'loading'|'success'|'error'|'cancelled', error?, startTime?, elapsed? }
	let modelStatuses = $state([]);
	let currentModelIndex = $state(-1);
	let abortControllers = $state({});
	let elapsedTimers = $state({});

	// Show translation prompt
	let showTranslationPrompt = $state(false);

	// Manual translations
	let manualTranslations = $state([]);
	let showManualForm = $state(false);
	let newManualTitle = $state('');
	let newManualText = $state('');

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

	onMount(async () => {
		const data = await currentProjectStore.load(parseInt(projectId));
		if (data) {
			project = data.project;
			rules = data.config;
			
			// Load saved comparison data
			const savedData = await projectsService.getWizardStepData(parseInt(projectId), 'compare');
			if (savedData) {
				if (savedData.sampleText) sampleText = savedData.sampleText;
				if (savedData.results) results = savedData.results;
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

	function buildTranslationSystemPrompt() {
		const sourceLanguage = project?.sourceLanguage || 'English';
		const targetLanguage = project?.targetLanguage || 'Persian';
		
		let systemPrompt = `You are a professional translator. Translate the following text from ${sourceLanguage} to ${targetLanguage}.
IMPORTANT OUTPUT RULES:
1. Output ONLY the translation.
2. Do NOT include "Translation:" or any other prefix/suffix.
3. Do NOT include notes or explanations.
4. Maintain the original tone and style.`;
		
		if (rules) {
			if (rules.tone?.length > 0) {
				systemPrompt += `\nTone: ${rules.tone.join(', ')}`;
			}
			if (rules.vocabularyLevel) {
				systemPrompt += `\nVocabulary level: ${rules.vocabularyLevel}`;
			}
			if (rules.translationType) {
				systemPrompt += `\nTranslation type: ${rules.translationType}`;
			}
			if (rules.customRules?.length > 0) {
				systemPrompt += `\nCustom rules:\n${rules.customRules.map(r => `- ${r}`).join('\n')}`;
			}
			if (rules.systemPrompt) {
				systemPrompt += `\n\nAdditional instructions: ${rules.systemPrompt}`;
			}
		}
		
		systemPrompt += `\n\nIMPORTANT: Translate paragraph by paragraph. Keep the same paragraph structure. Do not add or remove paragraphs.`;
		return systemPrompt;
	}

	const translationPromptPreview = $derived(buildTranslationSystemPrompt());

	function cancelModel(index) {
		const controller = abortControllers[index];
		if (controller) {
			controller.abort();
		}
	}

	function cancelAllModels() {
		for (const key of Object.keys(abortControllers)) {
			abortControllers[key]?.abort();
		}
	}

	function startElapsedTimer(index) {
		modelStatuses[index].startTime = Date.now();
		modelStatuses[index].elapsed = 0;
		elapsedTimers[index] = setInterval(() => {
			if (modelStatuses[index]?.startTime) {
				modelStatuses[index].elapsed = Math.floor((Date.now() - modelStatuses[index].startTime) / 1000);
				modelStatuses = [...modelStatuses];
			}
		}, 1000);
	}

	function stopElapsedTimer(index) {
		if (elapsedTimers[index]) {
			clearInterval(elapsedTimers[index]);
			delete elapsedTimers[index];
		}
		if (modelStatuses[index]?.startTime) {
			modelStatuses[index].elapsed = Math.floor((Date.now() - modelStatuses[index].startTime) / 1000);
		}
	}

	async function compareModels() {
		if (!sampleText.trim() || selectedModels.length === 0) return;
		
		comparing = true;
		results = [];
		currentModelIndex = -1;
		abortControllers = {};

		// Clear any leftover timers
		for (const key of Object.keys(elapsedTimers)) {
			clearInterval(elapsedTimers[key]);
		}
		elapsedTimers = {};

		// Initialize statuses
		modelStatuses = selectedModels.map(modelId => ({
			modelId,
			modelName: availableModels.find(m => m.id === modelId)?.name || modelId,
			status: 'pending',
			error: null,
			startTime: null,
			elapsed: 0
		}));

		// Save sample text
		await projectsService.saveWizardStepData(parseInt(projectId), 'compare', { sampleText });

		const systemPrompt = buildTranslationSystemPrompt();

		// Run models sequentially so user can see progress
		for (let i = 0; i < selectedModels.length; i++) {
			const modelId = selectedModels[i];
			currentModelIndex = i;

			// Create AbortController for this model
			const controller = new AbortController();
			abortControllers[i] = controller;
			abortControllers = { ...abortControllers };

			modelStatuses[i].status = 'loading';
			modelStatuses = [...modelStatuses];
			startElapsedTimer(i);

			try {
				const result = await openrouterService.sendMessage(
					settings.openRouterApiKey,
					modelId,
					[
						{ role: 'system', content: systemPrompt },
						{ role: 'user', content: `Translate this sentence:\n\n${sampleText}` }
					],
					{ temperature: 0, seed: 42, top_p: 1, signal: controller.signal }
				);

				stopElapsedTimer(i);

				if (result.cancelled) {
					modelStatuses[i].status = 'cancelled';
					modelStatuses[i].error = 'لغو شده';
				} else if (result.success) {
					modelStatuses[i].status = 'success';
					results = [...results, {
						modelId,
						modelName: modelStatuses[i].modelName,
						translation: result.content,
						error: null,
						rating: 0
					}];
				} else {
					modelStatuses[i].status = 'error';
					modelStatuses[i].error = result.error;
					results = [...results, {
						modelId,
						modelName: modelStatuses[i].modelName,
						translation: null,
						error: result.error,
						rating: 0
					}];
				}
			} catch (e) {
				stopElapsedTimer(i);
				if (e.name === 'AbortError') {
					modelStatuses[i].status = 'cancelled';
					modelStatuses[i].error = 'لغو شده';
				} else {
					modelStatuses[i].status = 'error';
					modelStatuses[i].error = e.message || 'خطای ناشناخته';
					results = [...results, {
						modelId,
						modelName: modelStatuses[i].modelName,
						translation: null,
						error: e.message || 'خطای ناشناخته',
						rating: 0
					}];
				}
			}

			delete abortControllers[i];
			abortControllers = { ...abortControllers };
			modelStatuses = [...modelStatuses];
		}

		currentModelIndex = -1;
		
		// Save results
		await projectsService.saveWizardStepData(parseInt(projectId), 'compare', { results });
		
		comparing = false;
	}

	function setRating(index, rating) {
		results[index].rating = rating;
		results = [...results];
		// Save updated ratings
		projectsService.saveWizardStepData(parseInt(projectId), 'compare', { results, manualTranslations });
	}

	function setManualRating(index, rating) {
		manualTranslations[index].rating = rating;
		manualTranslations = [...manualTranslations];
		projectsService.saveWizardStepData(parseInt(projectId), 'compare', { results, manualTranslations });
	}

	function addManualTranslation() {
		if (!newManualTitle.trim() || !newManualText.trim()) return;
		manualTranslations = [...manualTranslations, {
			modelId: `manual-${Date.now()}`,
			modelName: newManualTitle.trim(),
			translation: newManualText.trim(),
			rating: 0,
			error: null
		}];
		newManualTitle = '';
		newManualText = '';
		showManualForm = false;
		projectsService.saveWizardStepData(parseInt(projectId), 'compare', { results, manualTranslations });
	}

	function removeManualTranslation(index) {
		manualTranslations = manualTranslations.filter((_, i) => i !== index);
		projectsService.saveWizardStepData(parseInt(projectId), 'compare', { results, manualTranslations });
	}

	async function handleNext() {
		saving = true;
		await projectsService.updateSetupStep(parseInt(projectId), 'compare');
		// Save all data for judge page
		await projectsService.saveWizardStepData(parseInt(projectId), 'compare', { 
			sampleText, 
			results, 
			manualTranslations
		});
		saving = false;
		goto(`/projects/${projectId}/judge`);
	}

	function handleBack() {
		goto(`/projects/${projectId}/analyze`);
	}

	const totalTranslations = $derived(results.filter(r => r.translation && !r.error).length + manualTranslations.length);
	const canProceed = $derived(totalTranslations >= 2);
</script>

<WizardShell
	{steps}
	{currentStepIndex}
	projectTitle={project?.title}
	operationType="translation"
	{saving}
	{canProceed}
	finishLabel="ادامه"
	nextLabel="ادامه به داوری"
	onBack={handleBack}
	onNext={handleNext}
>
	<div class="space-y-6" dir="rtl">

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

			<div class="flex items-center gap-3">
				<Button onclick={compareModels} disabled={comparing || !sampleText.trim() || selectedModels.length === 0}>
					{comparing ? 'در حال مقایسه...' : 'شروع مقایسه'}
				</Button>
				<Button variant="outline" onclick={() => showTranslationPrompt = !showTranslationPrompt}>
					{showTranslationPrompt ? 'بستن پرامپت' : 'مشاهده پرامپت ترجمه'}
				</Button>
			</div>

			{#if showTranslationPrompt}
				<div class="mt-4 p-4 rounded-lg border bg-muted/30">
					<Label class="mb-2 block text-sm font-medium">پرامپت سیستم ترجمه (فقط خواندنی)</Label>
					<pre class="text-xs whitespace-pre-wrap font-mono bg-background p-3 rounded border max-h-[300px] overflow-auto" dir="ltr">{translationPromptPreview}</pre>
					<p class="text-xs text-muted-foreground mt-2">برای ویرایش پرامپت، به صفحه <a href="/projects/{projectId}/rules" class="underline text-primary">قوانین ترجمه</a> بروید.</p>
				</div>
			{/if}

			{#if modelStatuses.length > 0 && (comparing || modelStatuses.some(s => s.status !== 'pending'))}
				<div class="mt-4 p-4 rounded-lg border bg-muted/20 space-y-3">
					<div class="flex items-center justify-between text-sm font-medium">
						<span>پیشرفت ترجمه</span>
						<span class="text-muted-foreground">
							{modelStatuses.filter(s => s.status === 'success' || s.status === 'error' || s.status === 'cancelled').length} / {modelStatuses.length}
						</span>
						{#if comparing}
							<button
								class="text-xs text-red-500 hover:text-red-700 underline"
								onclick={cancelAllModels}
							>
								لغو همه
							</button>
						{/if}
					</div>
					<div class="w-full bg-muted rounded-full h-2">
						<div
							class="bg-primary h-2 rounded-full transition-all duration-300"
							style="width: {(modelStatuses.filter(s => s.status === 'success' || s.status === 'error' || s.status === 'cancelled').length / modelStatuses.length) * 100}%"
						></div>
					</div>
					<div class="space-y-1.5">
						{#each modelStatuses as ms, i}
							<div class="flex items-center gap-2 text-sm">
								{#if ms.status === 'pending'}
									<span class="w-5 h-5 flex items-center justify-center text-muted-foreground">⏳</span>
								{:else if ms.status === 'loading'}
									<span class="w-5 h-5 flex items-center justify-center"><span class="animate-spin">⏳</span></span>
								{:else if ms.status === 'success'}
									<span class="w-5 h-5 flex items-center justify-center text-green-600">✅</span>
								{:else if ms.status === 'error'}
									<span class="w-5 h-5 flex items-center justify-center text-red-600">❌</span>
								{:else if ms.status === 'cancelled'}
									<span class="w-5 h-5 flex items-center justify-center text-orange-500">⊘</span>
								{/if}
								<span class="flex-1 {ms.status === 'loading' ? 'font-medium' : ''}">{ms.modelName}</span>
								{#if ms.status === 'loading'}
									<span class="text-xs text-muted-foreground tabular-nums">{ms.elapsed || 0}s</span>
									<span class="text-xs text-muted-foreground animate-pulse">در حال ارسال...</span>
									<button
										class="text-xs text-red-500 hover:text-red-700 border border-red-300 rounded px-1.5 py-0.5 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
										onclick={() => cancelModel(i)}
									>
										لغو
									</button>
								{:else if ms.status === 'error'}
									<span class="text-xs text-muted-foreground tabular-nums">{ms.elapsed || 0}s</span>
									<span class="text-xs text-red-500 truncate max-w-[200px]" title={ms.error}>{ms.error}</span>
								{:else if ms.status === 'success'}
									<span class="text-xs text-muted-foreground tabular-nums">{ms.elapsed || 0}s</span>
									<span class="text-xs text-green-600">موفق</span>
								{:else if ms.status === 'cancelled'}
									<span class="text-xs text-orange-500">لغو شده</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Manual Translation Entry -->
	<Card class="mb-6">
		<CardHeader>
			<div class="flex items-center justify-between">
				<div>
					<CardTitle>✏️ ترجمه‌های دستی</CardTitle>
					<CardDescription>نمونه ترجمه‌های دستی (مثلاً ترجمه مترجم فعلی) را اضافه کنید</CardDescription>
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
		<h2 class="text-xl font-bold mb-4">نتایج مقایسه ({results.filter(r => r.translation && !r.error).length + manualTranslations.length} مورد)</h2>
		<!-- Results Grid -->
		<div class="grid gap-4 md:grid-cols-2">
			{#each results as result, index}
				{#if result.translation && !result.error}
					<Card>
						<CardHeader class="pb-2">
							<div class="flex items-center justify-between">
								<CardTitle class="text-lg">{result.modelName}</CardTitle>
								<span class="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">AI</span>
							</div>
						</CardHeader>
						<CardContent class="space-y-3">
							<p class="text-sm whitespace-pre-wrap" dir="auto">{result.translation}</p>
						</CardContent>
					</Card>
				{/if}
			{/each}

			<!-- Manual Translation Cards -->
			{#each manualTranslations as manual, index}
				<Card class="border-blue-200 dark:border-blue-800">
					<CardHeader class="pb-2">
						<div class="flex items-center justify-between">
							<CardTitle class="text-lg">{manual.modelName}</CardTitle>
							<span class="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">دستی</span>
						</div>
					</CardHeader>
					<CardContent class="space-y-3">
						<p class="text-sm whitespace-pre-wrap" dir="auto">{manual.translation}</p>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}

	</div>
</WizardShell>
