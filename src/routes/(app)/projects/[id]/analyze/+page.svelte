<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { currentProjectStore } from '$lib/stores/currentProject.store.js';
	import projectsService from '$lib/services/projects.service.js';
	import { settingsStore } from '$lib/stores/settings.store.js';
	import { openrouterService } from '$lib/services/openrouter.service.js';
	import WizardShell from '$lib/components/tarjomai/wizard-shell.svelte';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Textarea } from '$lib/components/ui-rtl/textarea';
	import { Label } from '$lib/components/ui-rtl/label';
	import { Input } from '$lib/components/ui-rtl/input';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui-rtl/card';
	import { Checkbox } from '$lib/components/ui-rtl/checkbox';
	import * as Select from '$lib/components/ui-rtl/select';
	import * as Tabs from '$lib/components/ui-rtl/tabs';
	import { toneOptions, vocabularyOptions, translationTypeOptions, structureOptions, getOptionLabel } from '$lib/translationOptions.js';
	import { allModels as fallbackModels, getModelName } from '$lib/models.js';
	import { fetchModels } from '$lib/stores/models.store.js';

	let projectId = $derived($page.params.id);
	let project = $state(null);
	let sampleText = $state('');
	let analyzing = $state(false);
	let analysisResult = $state(null);
	let settings = $state(null);
	let activeTab = $state('ai');
	let saving = $state(false);

	// Wizard steps
	const steps = [
		{ id: 'analyze', label: 'تحلیل سبک', description: 'تحلیل سبک نگارش متن' },
		{ id: 'compare', label: 'مقایسه مدل‌ها', description: 'مقایسه خروجی مدل‌های مختلف' },
		{ id: 'judge', label: 'داوری', description: 'ارزیابی و انتخاب نهایی' }
	];
	let currentStepIndex = $state(0);

	// Model selection
	let availableModels = $state(fallbackModels);
	let loadingModels = $state(false);
	let analyzeModelSearchQuery = $state('');
	let analyzeModel = $state('anthropic/claude-sonnet-4');

	const filteredAnalyzeModels = $derived(
		analyzeModelSearchQuery.trim()
			? availableModels.filter(m =>
				m.name.toLowerCase().includes(analyzeModelSearchQuery.toLowerCase()) ||
				m.id.toLowerCase().includes(analyzeModelSearchQuery.toLowerCase()) ||
				m.provider.toLowerCase().includes(analyzeModelSearchQuery.toLowerCase())
			)
			: availableModels
	);

	const analyzeModelName = $derived(availableModels.find(m => m.id === analyzeModel)?.name || analyzeModel);

	// Editable analysis prompt
	let showAnalyzePrompt = $state(false);
	let analyzePrompt = $state(`Analyze the writing style of the following text and provide a JSON response with these fields:
- tone: array of tones (formal, informal, literary, scientific, conversational, religious)
- vocabularyLevel: string (simple, medium, advanced)
- sentenceStructure: string (short, medium, long, mixed)
- fidelity: string (low, medium, high, literal)
- translationType: string (literal, free, balanced)
- customRules: array of specific rules for translation

Text to analyze:
{sampleText}

Respond ONLY with valid JSON.`);

	// Analysis status
	let analyzeStatus = $state('idle'); // 'idle' | 'loading' | 'success' | 'error'
	let analyzeError = $state('');

	let analyzeOptions = $state({
		tone: true,
		vocabulary: true,
		structure: true,
		style: true
	});

	// Editable result fields
	let editableTone = $state([]);
	let editableVocabulary = $state('medium');
	let editableStructure = $state('medium');
	let editableTranslationType = $state('balanced');
	let editableCustomRules = $state('');

	const vocabularyLabel = $derived(getOptionLabel(vocabularyOptions, editableVocabulary));
	const structureLabel = $derived(getOptionLabel(structureOptions, editableStructure));
	const translationTypeLabel = $derived(getOptionLabel(translationTypeOptions, editableTranslationType));

	onMount(async () => {
		const data = await currentProjectStore.load(parseInt(projectId));
		if (data) {
			project = data.project;
			
			// Load saved wizard data
			const savedData = await projectsService.getWizardStepData(parseInt(projectId), 'analyze');
			if (savedData) {
				if (savedData.sampleText) sampleText = savedData.sampleText;
				if (savedData.result) {
					analysisResult = savedData.result;
					if (savedData.editableTone) editableTone = savedData.editableTone;
					if (savedData.editableVocabulary) editableVocabulary = savedData.editableVocabulary;
					if (savedData.editableStructure) editableStructure = savedData.editableStructure;
					if (savedData.editableTranslationType) editableTranslationType = savedData.editableTranslationType;
					if (savedData.editableCustomRules) editableCustomRules = savedData.editableCustomRules;
				}
				if (savedData.activeTab) activeTab = savedData.activeTab;
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

		// Use default model from settings if available
		if (settings?.defaultModels?.styleAnalysis) {
			analyzeModel = settings.defaultModels.styleAnalysis;
		}
	});

	// Auto-save wizard data when values change
	async function saveWizardData() {
		if (!projectId) return;
		const dataToSave = JSON.parse(JSON.stringify({
			sampleText,
			result: analysisResult,
			editableTone: [...editableTone],
			editableVocabulary,
			editableStructure,
			editableTranslationType,
			editableCustomRules,
			activeTab
		}));
		await projectsService.saveWizardStepData(parseInt(projectId), 'analyze', dataToSave);
	}

	async function analyzeStyle() {
		if (!sampleText.trim() || !settings?.openRouterApiKey) return;
		
		analyzing = true;
		analysisResult = null;
		analyzeStatus = 'loading';
		analyzeError = '';

		const finalPrompt = analyzePrompt.replace('{sampleText}', sampleText);

		const result = await openrouterService.sendMessage(
			settings.openRouterApiKey,
			analyzeModel,
			[{ role: 'user', content: finalPrompt }],
			{ temperature: 0, seed: 42, top_p: 1 }
		);

		if (result.success) {
			analyzeStatus = 'success';
			try {
				let jsonContent = result.content.trim();
				const codeBlockMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
				if (codeBlockMatch) jsonContent = codeBlockMatch[1].trim();
				if (!jsonContent.startsWith('{')) {
					const idx = jsonContent.indexOf('{');
					if (idx !== -1) jsonContent = jsonContent.substring(idx);
				}

				const parsed = JSON.parse(jsonContent);
				analysisResult = parsed;
				
				// Populate editable fields
				if (Array.isArray(parsed.tone)) {
					editableTone = [...parsed.tone];
				}
				if (parsed.vocabularyLevel) {
					editableVocabulary = parsed.vocabularyLevel;
				}
				if (parsed.sentenceStructure) {
					editableStructure = parsed.sentenceStructure;
				}
				if (parsed.translationType) {
					editableTranslationType = parsed.translationType;
				}
				if (Array.isArray(parsed.customRules)) {
					editableCustomRules = parsed.customRules.join('\n');
				}
			} catch (e) {
				analyzeStatus = 'error';
				analyzeError = 'خطا در پردازش JSON نتیجه';
				analysisResult = { error: 'خطا در پردازش نتیجه', raw: result.content };
			}
		} else {
			analyzeStatus = 'error';
			analyzeError = result.error;
			analysisResult = { error: result.error };
		}

		analyzing = false;
		await saveWizardData();
	}

	function toggleTone(tone) {
		if (editableTone.includes(tone)) {
			editableTone = editableTone.filter(t => t !== tone);
		} else {
			editableTone = [...editableTone, tone];
		}
	}

	async function handleNext() {
		// For AI mode, check if we have valid result
		if (activeTab === 'ai' && (!analysisResult || analysisResult.error)) return;
		
		saving = true;
		
		// Build clean serializable object from editable fields
		const rulesToSave = {
			name: activeTab === 'ai' ? 'تحلیل خودکار' : 'تنظیم دستی',
			tone: editableTone.length > 0 ? [...editableTone] : ['formal'],
			vocabularyLevel: editableVocabulary || 'medium',
			sentenceStructure: editableStructure || 'medium',
			translationType: editableTranslationType || 'balanced',
			customRules: editableCustomRules.trim() ? editableCustomRules.split('\n').filter(r => r.trim()) : [],
			fidelity: analysisResult?.fidelity || 'medium'
		};
		
		// Save wizard data before leaving
		await saveWizardData();
		
		await currentProjectStore.saveRules(rulesToSave);
		await projectsService.updateSetupStep(parseInt(projectId), 'analyze');
		
		saving = false;
		goto(`/projects/${projectId}/compare`);
	}

	function handleBack() {
		goto('/');
	}

	// Check if manual form is valid (at least one tone selected)
	const isManualFormValid = $derived(editableTone.length > 0);
	const canProceed = $derived(activeTab === 'ai' ? (analysisResult && !analysisResult.error) : isManualFormValid);
</script>

<WizardShell
	{steps}
	{currentStepIndex}
	projectTitle={project?.title}
	operationType="translation"
	{saving}
	{canProceed}
	finishLabel="ادامه"
	nextLabel="ادامه به مقایسه"
	onBack={handleBack}
	onNext={handleNext}
>
	<div class="space-y-6" dir="rtl">
		<Tabs.Root value={activeTab} onValueChange={(v) => activeTab = v} class="mb-6">
			<Tabs.List class="grid w-full grid-cols-2">
				<Tabs.Trigger value="ai">🤖 تحلیل با AI</Tabs.Trigger>
				<Tabs.Trigger value="manual">✏️ تنظیم دستی</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="ai" class="mt-4">
				<Card>
					<CardHeader>
						<CardTitle>متن نمونه</CardTitle>
						<CardDescription>
							یک پاراگراف یا بخش نمونه از متنی که می‌خواهید ترجمه کنید وارد کنید تا AI سبک را تحلیل کند
						</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<Textarea 
							bind:value={sampleText}
							rows={8}
							placeholder="متن نمونه را اینجا وارد کنید..."
							dir="auto"
						/>

						<div class="flex flex-wrap gap-4">
							<label class="flex items-center gap-2">
								<Checkbox bind:checked={analyzeOptions.tone} />
								<span class="text-sm">لحن</span>
							</label>
							<label class="flex items-center gap-2">
								<Checkbox bind:checked={analyzeOptions.vocabulary} />
								<span class="text-sm">سطح واژگان</span>
							</label>
							<label class="flex items-center gap-2">
								<Checkbox bind:checked={analyzeOptions.structure} />
								<span class="text-sm">ساختار جمله</span>
							</label>
							<label class="flex items-center gap-2">
								<Checkbox bind:checked={analyzeOptions.style} />
								<span class="text-sm">سبک ترجمه</span>
							</label>
						</div>

						<!-- Model Selection - Combobox Pattern -->
						<div class="space-y-2">
							<Label>
								مدل تحلیل
								{#if loadingModels}
									<span class="text-xs text-muted-foreground mr-2">در حال دریافت لیست مدل‌ها...</span>
								{/if}
							</Label>
							<Select.Root type="single" value={analyzeModel} onValueChange={(v) => analyzeModel = v}>
								<Select.Trigger class="w-full max-w-md">
									{analyzeModelName}
								</Select.Trigger>
								<Select.Content class="max-h-[300px] overflow-y-auto">
									<!-- Search input inside dropdown (combobox pattern) -->
									<div class="p-2 border-b sticky top-0 bg-background z-10">
										<Input
											bind:value={analyzeModelSearchQuery}
											placeholder="جستجوی مدل..."
											dir="auto"
											class="h-8 text-sm"
										/>
									</div>
									{#each filteredAnalyzeModels as model}
										<Select.Item value={model.id} label={model.name}>{model.name}</Select.Item>
									{/each}
									{#if filteredAnalyzeModels.length === 0 && analyzeModelSearchQuery.trim()}
										<div class="p-2 text-sm text-muted-foreground text-center">مدلی پیدا نشد</div>
									{/if}
								</Select.Content>
							</Select.Root>
						</div>

						<div class="flex items-center gap-3">
							<Button onclick={analyzeStyle} disabled={analyzing || !sampleText.trim()}>
								{analyzing ? 'در حال تحلیل...' : 'شروع تحلیل'}
							</Button>
							<Button variant="outline" onclick={() => showAnalyzePrompt = !showAnalyzePrompt}>
								{showAnalyzePrompt ? 'بستن پرامپت' : 'مشاهده / ویرایش پرامپت'}
							</Button>
						</div>

						{#if showAnalyzePrompt}
							<div class="p-4 rounded-lg border bg-muted/30 space-y-2">
								<Label class="mb-1 block text-sm font-medium">پرامپت تحلیل (قابل ویرایش)</Label>
								<Textarea
									bind:value={analyzePrompt}
									rows={10}
									class="font-mono text-sm"
									dir="ltr"
								/>
								<p class="text-xs text-muted-foreground">
									متغیر {'{sampleText}'} با متن نمونه جایگزین می‌شود.
								</p>
							</div>
						{/if}

						{#if analyzeStatus !== 'idle'}
							<div class="flex items-center gap-2 text-sm p-3 rounded-lg border {analyzeStatus === 'loading' ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' : analyzeStatus === 'success' ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'}">
								{#if analyzeStatus === 'loading'}
									<span class="animate-spin">⏳</span>
									<span>در حال ارسال به {analyzeModelName}...</span>
								{:else if analyzeStatus === 'success'}
									<span>✅</span>
									<span class="text-green-700 dark:text-green-300">تحلیل با موفقیت انجام شد ({analyzeModelName})</span>
								{:else if analyzeStatus === 'error'}
									<span>❌</span>
									<span class="text-red-700 dark:text-red-300">خطا: {analyzeError}</span>
								{/if}
							</div>
						{/if}
					</CardContent>
				</Card>

				{#if analysisResult}
					<Card class="mt-4">
						<CardHeader>
							<CardTitle>نتیجه تحلیل</CardTitle>
							<CardDescription>می‌توانید مقادیر را ویرایش کنید</CardDescription>
						</CardHeader>
						<CardContent>
							{#if analysisResult.error}
								<p class="text-red-600">{analysisResult.error}</p>
								{#if analysisResult.raw}
									<pre class="mt-2 p-4 bg-muted rounded text-sm overflow-auto">{analysisResult.raw}</pre>
								{/if}
							{:else}
								{@render styleFields()}
							{/if}
						</CardContent>
					</Card>
				{/if}
			</Tabs.Content>

			<Tabs.Content value="manual" class="mt-4">
				<Card>
					<CardHeader>
						<CardTitle>تنظیمات دستی</CardTitle>
						<CardDescription>سبک و قوانین ترجمه را خودتان مشخص کنید</CardDescription>
					</CardHeader>
					<CardContent>
						{@render styleFields()}
					</CardContent>
				</Card>
			</Tabs.Content>
		</Tabs.Root>
	</div>
</WizardShell>

{#snippet styleFields()}
	<div class="space-y-6">
		<!-- لحن -->
		<div>
			<Label class="mb-2 block">لحن (می‌توانید چند مورد انتخاب کنید)</Label>
			<div class="flex flex-wrap gap-2">
				{#each toneOptions as option}
					<button
						type="button"
						class="px-3 py-1.5 rounded-full text-sm border transition-colors {editableTone.includes(option.value) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted hover:bg-muted/80 border-transparent'}"
						onclick={() => toggleTone(option.value)}
					>
						{option.label}
					</button>
				{/each}
			</div>
		</div>

		<!-- سطح واژگان -->
		<div>
			<Label class="mb-2 block">سطح واژگان</Label>
			<Select.Root type="single" bind:value={editableVocabulary}>
				<Select.Trigger class="w-full max-w-xs">
					{vocabularyLabel}
				</Select.Trigger>
				<Select.Content>
					{#each vocabularyOptions as option}
						<Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<!-- ساختار جمله -->
		<div>
			<Label class="mb-2 block">ساختار جمله</Label>
			<Select.Root type="single" bind:value={editableStructure}>
				<Select.Trigger class="w-full max-w-xs">
					{structureLabel}
				</Select.Trigger>
				<Select.Content>
					{#each structureOptions as option}
						<Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<!-- نوع ترجمه -->
		<div>
			<Label class="mb-2 block">نوع ترجمه</Label>
			<Select.Root type="single" bind:value={editableTranslationType}>
				<Select.Trigger class="w-full max-w-xs">
					{translationTypeLabel}
				</Select.Trigger>
				<Select.Content>
					{#each translationTypeOptions as option}
						<Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<!-- قوانین سفارشی -->
		<div>
			<Label class="mb-2 block">قوانین سفارشی (هر خط یک قانون)</Label>
			<Textarea 
				bind:value={editableCustomRules}
				rows={4}
				placeholder="قوانین خاص ترجمه را اینجا بنویسید..."
				dir="auto"
			/>
		</div>
	</div>
{/snippet}
