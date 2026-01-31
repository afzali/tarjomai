<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { currentProjectStore } from '$lib/stores/currentProject.store.js';
	import projectsService from '$lib/services/projects.service.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Input } from '$lib/components/ui-rtl/input';
	import { Label } from '$lib/components/ui-rtl/label';
	import { Textarea } from '$lib/components/ui-rtl/textarea';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui-rtl/card';
	import * as Select from '$lib/components/ui-rtl/select';

	let projectId = $derived($page.params.id);
	let project = $state(null);
	let saving = $state(false);

	let selectedModel = $state('anthropic/claude-3.5-sonnet');
	let tone = $state('formal');
	let vocabularyLevel = $state('medium');
	let translationType = $state('balanced');
	let customRules = $state('');

	const models = [
		{ value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
		{ value: 'openai/gpt-4o', label: 'GPT-4o' },
		{ value: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5' },
		{ value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' }
	];

	const toneItems = [
		{ value: 'formal', label: 'رسمی' },
		{ value: 'informal', label: 'غیررسمی' },
		{ value: 'literary', label: 'ادبی' },
		{ value: 'scientific', label: 'علمی' },
		{ value: 'conversational', label: 'محاوره‌ای' }
	];

	const vocabularyItems = [
		{ value: 'simple', label: 'ساده' },
		{ value: 'medium', label: 'متوسط' },
		{ value: 'advanced', label: 'پیشرفته' }
	];

	const translationTypeItems = [
		{ value: 'literal', label: 'تحت‌اللفظی' },
		{ value: 'balanced', label: 'متعادل' },
		{ value: 'free', label: 'آزاد' }
	];

	const modelLabel = $derived(models.find(m => m.value === selectedModel)?.label ?? 'انتخاب مدل');
	const toneLabel = $derived(toneItems.find(t => t.value === tone)?.label ?? 'انتخاب لحن');
	const vocabularyLabel = $derived(vocabularyItems.find(v => v.value === vocabularyLevel)?.label ?? 'انتخاب سطح');
	const translationTypeLabel = $derived(translationTypeItems.find(t => t.value === translationType)?.label ?? 'انتخاب نوع');

	onMount(async () => {
		const data = await currentProjectStore.load(parseInt(projectId));
		if (data) {
			project = data.project;
			if (data.rules) {
				tone = data.rules.tone?.[0] || 'formal';
				vocabularyLevel = data.rules.vocabularyLevel || 'medium';
				translationType = data.rules.translationType || 'balanced';
				customRules = data.rules.customRules?.join('\n') || '';
			}
		}
	});

	async function saveAndContinue() {
		saving = true;

		await currentProjectStore.updateProject({
			defaultModel: selectedModel
		});

		await currentProjectStore.saveRules({
			name: 'تنظیم دستی',
			tone: [tone],
			vocabularyLevel,
			translationType,
			customRules: customRules.split('\n').filter(r => r.trim())
		});

		await projectsService.updateSetupStep(parseInt(projectId), 'completed');
		goto(`/projects/${projectId}`);
	}
</script>

<div class="container mx-auto py-8 px-4 max-w-2xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold">تنظیم سریع</h1>
		<p class="text-muted-foreground mt-1">
			مدل و قوانین ترجمه را مستقیماً تنظیم کنید
		</p>
	</div>

	<Card class="mb-6">
		<CardHeader>
			<CardTitle>انتخاب مدل</CardTitle>
		</CardHeader>
		<CardContent>
			<Select.Root type="single" bind:value={selectedModel}>
				<Select.Trigger class="w-full">
					{modelLabel}
				</Select.Trigger>
				<Select.Content>
					{#each models as model (model.value)}
						<Select.Item value={model.value} label={model.label}>{model.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</CardContent>
	</Card>

	<Card class="mb-6">
		<CardHeader>
			<CardTitle>قوانین ترجمه</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="space-y-2">
				<Label>لحن</Label>
				<Select.Root type="single" bind:value={tone}>
					<Select.Trigger class="w-full">
						{toneLabel}
					</Select.Trigger>
					<Select.Content>
						{#each toneItems as item (item.value)}
							<Select.Item value={item.value} label={item.label}>{item.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-2">
				<Label>سطح واژگان</Label>
				<Select.Root type="single" bind:value={vocabularyLevel}>
					<Select.Trigger class="w-full">
						{vocabularyLabel}
					</Select.Trigger>
					<Select.Content>
						{#each vocabularyItems as item (item.value)}
							<Select.Item value={item.value} label={item.label}>{item.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-2">
				<Label>نوع ترجمه</Label>
				<Select.Root type="single" bind:value={translationType}>
					<Select.Trigger class="w-full">
						{translationTypeLabel}
					</Select.Trigger>
					<Select.Content>
						{#each translationTypeItems as item (item.value)}
							<Select.Item value={item.value} label={item.label}>{item.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-2">
				<Label>قوانین سفارشی (هر خط یک قانون)</Label>
				<Textarea 
					bind:value={customRules}
					rows={4}
					placeholder="مثال: اصطلاحات فنی را ترجمه نکن"
				/>
			</div>
		</CardContent>
	</Card>

	<div class="flex gap-2">
		<Button variant="outline" href="/">
			انصراف
		</Button>
		<Button onclick={saveAndContinue} disabled={saving}>
			{saving ? 'در حال ذخیره...' : 'ذخیره و رفتن به Workspace'}
		</Button>
	</div>
</div>
