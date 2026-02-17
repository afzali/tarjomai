<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { currentProjectStore } from '$lib/stores/currentProject.store.js';
	import { rulesService } from '$lib/services/rules.service.js';
	import projectsService from '$lib/services/projects.service.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Input } from '$lib/components/ui-rtl/input';
	import { Label } from '$lib/components/ui-rtl/label';
	import { Textarea } from '$lib/components/ui-rtl/textarea';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui-rtl/card';
	import * as Select from '$lib/components/ui-rtl/select';
	import { allModels as fallbackModels } from '$lib/models.js';
	import { fetchModels } from '$lib/stores/models.store.js';
	import { settingsStore } from '$lib/stores/settings.store.js';

	let projectId = $derived($page.params.id);
	let project = $state(null);
	let rules = $state(null);
	let presets = $state([]);
	let saving = $state(false);
	let selectedModel = $state('');
	let settings = $state(null);

	// Dynamic model list from OpenRouter API
	let availableModels = $state(fallbackModels);
	let loadingModels = $state(false);
	let modelSearchQuery = $state('');

	const filteredModels = $derived(
		modelSearchQuery.trim()
			? availableModels.filter(m =>
				m.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
				m.id.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
				m.provider.toLowerCase().includes(modelSearchQuery.toLowerCase())
			)
			: availableModels
	);

	const selectedModelLabel = $derived(
		availableModels.find(m => m.id === selectedModel)?.name ?? 'انتخاب مدل'
	);

	let tone = $state('formal');
	let vocabularyLevel = $state('medium');
	let translationType = $state('balanced');
	let fidelity = $state('medium');
	let customRules = $state('');
	let systemPrompt = $state('');

	const toneOptions = [
		{ value: 'formal', label: 'رسمی' },
		{ value: 'informal', label: 'غیررسمی' },
		{ value: 'literary', label: 'ادبی' },
		{ value: 'scientific', label: 'علمی' },
		{ value: 'conversational', label: 'محاوره‌ای' }
	];

	const vocabularyOptions = [
		{ value: 'simple', label: 'ساده' },
		{ value: 'medium', label: 'متوسط' },
		{ value: 'advanced', label: 'پیشرفته' }
	];

	const translationTypeOptions = [
		{ value: 'literal', label: 'تحت‌اللفظی' },
		{ value: 'balanced', label: 'متعادل' },
		{ value: 'free', label: 'آزاد' }
	];

	const fidelityOptions = [
		{ value: 'low', label: 'کم' },
		{ value: 'medium', label: 'متوسط' },
		{ value: 'high', label: 'زیاد' },
		{ value: 'literal', label: 'تحت‌اللفظی' }
	];

	const toneLabel = $derived(toneOptions.find(t => t.value === tone)?.label ?? 'انتخاب');
	const vocabularyLabel = $derived(vocabularyOptions.find(v => v.value === vocabularyLevel)?.label ?? 'انتخاب');
	const translationTypeLabel = $derived(translationTypeOptions.find(t => t.value === translationType)?.label ?? 'انتخاب');
	const fidelityLabel = $derived(fidelityOptions.find(f => f.value === fidelity)?.label ?? 'انتخاب');

	onMount(async () => {
		const data = await currentProjectStore.load(parseInt(projectId));
		if (data) {
			project = data.project;
			rules = data.rules;
			if (rules) {
				tone = rules.tone?.[0] || 'formal';
				vocabularyLevel = rules.vocabularyLevel || 'medium';
				translationType = rules.translationType || 'balanced';
				fidelity = rules.fidelity || 'medium';
				customRules = rules.customRules?.join('\n') || '';
				systemPrompt = rules.systemPrompt || '';
			}
			selectedModel = data.project?.defaultModel || 'anthropic/claude-sonnet-4';
		}
		presets = await rulesService.getPresets();

		// Fetch models from OpenRouter API
		settings = await settingsStore.load();
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

	async function saveRules() {
		saving = true;
		await currentProjectStore.saveRules({
			name: rules?.name || 'قوانین پروژه',
			tone: [tone],
			vocabularyLevel,
			translationType,
			fidelity,
			customRules: customRules.split('\n').filter(r => r.trim()),
			systemPrompt
		});
		// Save selected model to project
		if (selectedModel && project) {
			await projectsService.updateProject(project.id, { defaultModel: selectedModel });
		}
		saving = false;
	}

	async function saveAsPreset() {
		const name = prompt('نام پیش‌تنظیم:');
		if (name) {
			await rulesService.savePreset({
				name,
				tone: [tone],
				vocabularyLevel,
				translationType,
				fidelity,
				customRules: customRules.split('\n').filter(r => r.trim()),
				systemPrompt
			});
			presets = await rulesService.getPresets();
		}
	}

	async function loadPreset(presetId) {
		const preset = presets.find(p => p.id === presetId);
		if (preset) {
			tone = preset.tone?.[0] || 'formal';
			vocabularyLevel = preset.vocabularyLevel || 'medium';
			translationType = preset.translationType || 'balanced';
			fidelity = preset.fidelity || 'medium';
			customRules = preset.customRules?.join('\n') || '';
			systemPrompt = preset.systemPrompt || '';
		}
	}

	async function exportRules() {
		const data = await rulesService.exportRules(parseInt(projectId));
		if (data) {
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `rules-${projectId}.json`;
			a.click();
			URL.revokeObjectURL(url);
		}
	}

	async function importRules(event) {
		const file = event.target.files?.[0];
		if (file) {
			const text = await file.text();
			const data = JSON.parse(text);
			await rulesService.importRules(parseInt(projectId), data);
			window.location.reload();
		}
	}
</script>

<div class="container mx-auto py-8 px-4 max-w-2xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold">قوانین ترجمه</h1>
		<p class="text-muted-foreground mt-1">
			تنظیم قوانین و سبک ترجمه برای پروژه
		</p>
	</div>

	<!-- Model Selection -->
	<Card class="mb-6">
		<CardHeader>
			<CardTitle>🤖 مدل ترجمه</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="space-y-2">
				<Label>
					مدل پیش‌فرض برای ترجمه
					{#if loadingModels}
						<span class="text-xs text-muted-foreground mr-2">در حال دریافت لیست مدل‌ها...</span>
					{/if}
				</Label>
				<Input
					bind:value={modelSearchQuery}
					placeholder="جستجوی مدل... (نام، شناسه یا ارائه‌دهنده)"
					dir="auto"
					class="mb-2"
				/>
				<Select.Root type="single" value={selectedModel} onValueChange={(v) => selectedModel = v || 'anthropic/claude-sonnet-4'}>
					<Select.Trigger class="w-full">{selectedModelLabel}</Select.Trigger>
					<Select.Content class="max-h-[300px] overflow-y-auto">
						{#each filteredModels as model}
							<Select.Item value={model.id} label={model.name}>
								<span class="flex items-center gap-2">
									<span class="text-xs text-muted-foreground">{model.provider}</span>
									<span>{model.name}</span>
								</span>
							</Select.Item>
						{/each}
						{#if filteredModels.length === 0 && modelSearchQuery.trim()}
							<div class="p-2 text-sm text-muted-foreground text-center">مدلی پیدا نشد</div>
						{/if}
					</Select.Content>
				</Select.Root>
				<p class="text-xs text-muted-foreground">این مدل برای ترجمه فصل‌ها استفاده خواهد شد ({availableModels.length} مدل موجود)</p>
			</div>
		</CardContent>
	</Card>

	{#if presets.length > 0}
		<Card class="mb-6">
			<CardHeader>
				<CardTitle>پیش‌تنظیم‌ها</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="flex flex-wrap gap-2">
					{#each presets as preset}
						<Button variant="outline" size="sm" onclick={() => loadPreset(preset.id)}>
							{preset.name}
						</Button>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}

	<Card class="mb-6">
		<CardHeader>
			<CardTitle>تنظیمات سبک</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label>لحن</Label>
					<Select.Root type="single" value={tone} onValueChange={(v) => tone = v || 'formal'}>
						<Select.Trigger class="w-full">{toneLabel}</Select.Trigger>
						<Select.Content>
							{#each toneOptions as opt}
								<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-2">
					<Label>سطح واژگان</Label>
					<Select.Root type="single" value={vocabularyLevel} onValueChange={(v) => vocabularyLevel = v || 'medium'}>
						<Select.Trigger class="w-full">{vocabularyLabel}</Select.Trigger>
						<Select.Content>
							{#each vocabularyOptions as opt}
								<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-2">
					<Label>نوع ترجمه</Label>
					<Select.Root type="single" value={translationType} onValueChange={(v) => translationType = v || 'balanced'}>
						<Select.Trigger class="w-full">{translationTypeLabel}</Select.Trigger>
						<Select.Content>
							{#each translationTypeOptions as opt}
								<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-2">
					<Label>وفاداری به متن</Label>
					<Select.Root type="single" value={fidelity} onValueChange={(v) => fidelity = v || 'medium'}>
						<Select.Trigger class="w-full">{fidelityLabel}</Select.Trigger>
						<Select.Content>
							{#each fidelityOptions as opt}
								<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<div class="space-y-2">
				<Label>قوانین سفارشی (هر خط یک قانون)</Label>
				<Textarea bind:value={customRules} rows={4} placeholder="مثال: اصطلاحات فنی را ترجمه نکن" />
			</div>

			<div class="space-y-2">
				<Label>پرامپت سیستم (اختیاری)</Label>
				<Textarea bind:value={systemPrompt} rows={4} placeholder="دستورالعمل‌های اضافی برای مدل..." />
			</div>
		</CardContent>
	</Card>

	<div class="flex flex-wrap gap-2">
		<Button variant="outline" href="/projects/{projectId}">بازگشت</Button>
		<Button variant="outline" onclick={exportRules}>خروجی JSON</Button>
		<label class="inline-flex cursor-pointer">
			<input type="file" accept=".json" class="hidden" onchange={importRules} />
			<span class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
				ورودی JSON
			</span>
		</label>
		<Button variant="outline" onclick={saveAsPreset}>ذخیره به عنوان پیش‌تنظیم</Button>
		<Button onclick={saveRules} disabled={saving}>
			{saving ? 'در حال ذخیره...' : 'ذخیره قوانین'}
		</Button>
	</div>
</div>
