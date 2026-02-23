<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { currentProjectStore } from '$lib/stores/currentProject.store.js';
	import projectsService from '$lib/services/projects.service.js';
	import { settingsStore } from '$lib/stores/settings.store.js';
	import { openrouterService } from '$lib/services/openrouter.service.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Textarea } from '$lib/components/ui-rtl/textarea';
	import { Label } from '$lib/components/ui-rtl/label';
	import { Input } from '$lib/components/ui-rtl/input';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui-rtl/card';
	import { Checkbox } from '$lib/components/ui-rtl/checkbox';
	import * as Select from '$lib/components/ui-rtl/select';
	import * as Tabs from '$lib/components/ui-rtl/tabs';
	import { toneOptions, vocabularyOptions, translationTypeOptions, structureOptions, getOptionLabel } from '$lib/translationOptions.js';

	let projectId = $derived($page.params.id);
	let project = $state(null);
	let sampleText = $state('');
	let analyzing = $state(false);
	let analysisResult = $state(null);
	let settings = $state(null);
	let activeTab = $state('ai');

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
	});

	// Auto-save wizard data when values change
	async function saveWizardData() {
		if (!projectId) return;
		// Serialize data to ensure it's clonable for IndexedDB
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

		const prompt = `Analyze the writing style of the following text and provide a JSON response with these fields:
- tone: array of tones (formal, informal, literary, scientific, conversational, religious)
- vocabularyLevel: string (simple, medium, advanced)
- sentenceStructure: string (short, medium, long, mixed)
- fidelity: string (low, medium, high, literal)
- translationType: string (literal, free, balanced)
- customRules: array of specific rules for translation

Text to analyze:
${sampleText}

Respond ONLY with valid JSON.`;

		const result = await openrouterService.sendMessage(
			settings.openRouterApiKey,
			settings.defaultModels?.styleAnalysis || 'anthropic/claude-sonnet-4',
			[{ role: 'user', content: prompt }],
			{ temperature: 0, seed: 42, top_p: 1 }
		);

		if (result.success) {
			try {
				const parsed = JSON.parse(result.content);
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
			} catch {
				analysisResult = { error: 'خطا در پردازش نتیجه', raw: result.content };
			}
		} else {
			analysisResult = { error: result.error };
		}

		analyzing = false;
	}

	function toggleTone(tone) {
		if (editableTone.includes(tone)) {
			editableTone = editableTone.filter(t => t !== tone);
		} else {
			editableTone = [...editableTone, tone];
		}
	}

	async function saveAndContinue() {
		// For AI mode, check if we have valid result
		if (activeTab === 'ai' && (!analysisResult || analysisResult.error)) return;
		
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
		goto(`/projects/${projectId}/compare`);
	}

	// Check if manual form is valid (at least one tone selected)
	const isManualFormValid = $derived(editableTone.length > 0);

	// Wizard navigation
	const wizardSteps = $derived([
		{ id: 'analyze', label: 'تحلیل سبک', url: `/projects/${projectId}/analyze`, active: true },
		{ id: 'compare', label: 'مقایسه مدل‌ها', url: `/projects/${projectId}/compare`, active: false },
		{ id: 'workspace', label: 'فضای کار', url: `/projects/${projectId}`, active: false }
	]);
	const currentStepIndex = 0;

	async function goBack() {
		await saveWizardData();
		goto('/');
	}
</script>

<div class="container mx-auto py-8 px-4 max-w-4xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold">تنظیم سبک ترجمه</h1>
		<p class="text-muted-foreground mt-1">
			سبک و قوانین ترجمه را تنظیم کنید - با تحلیل AI یا به صورت دستی
		</p>
	</div>

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

					<Button onclick={analyzeStyle} disabled={analyzing || !sampleText.trim()}>
						{analyzing ? 'در حال تحلیل...' : 'شروع تحلیل'}
					</Button>
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

	<!-- Wizard Progress -->
	<div class="mb-6 flex items-center justify-center gap-2">
		{#each wizardSteps as step, i}
			<div class="flex items-center">
				<a 
					href={step.url}
					class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors {step.active ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}"
				>
					<span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold {step.active ? 'bg-primary-foreground text-primary' : 'bg-background'}">{i + 1}</span>
					<span class="text-sm">{step.label}</span>
				</a>
				{#if i < wizardSteps.length - 1}
					<span class="mx-2 text-muted-foreground">→</span>
				{/if}
			</div>
		{/each}
	</div>

	<div class="flex justify-between">
		<Button variant="outline" onclick={goBack}>
			← بازگشت به لیست
		</Button>
		<div class="flex gap-2">
			{#if activeTab === 'ai'}
				{#if analysisResult && !analysisResult.error}
					<Button onclick={saveAndContinue}>
						ذخیره و ادامه به مقایسه مدل‌ها →
					</Button>
				{/if}
			{:else}
				<Button onclick={saveAndContinue} disabled={!isManualFormValid}>
					ذخیره و ادامه به مقایسه مدل‌ها →
				</Button>
			{/if}
		</div>
	</div>
</div>
