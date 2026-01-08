<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { currentProjectStore } from '$lib/stores/currentProject.store.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Input } from '$lib/components/ui-rtl/input';
	import { Label } from '$lib/components/ui-rtl/label';
	import { Textarea } from '$lib/components/ui-rtl/textarea';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui-rtl/card';
	import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui-rtl/select';

	let projectId = $derived($page.params.id);
	let project = $state(null);
	let saving = $state(false);

	let selectedModel = $state('anthropic/claude-3.5-sonnet');
	let tone = $state('formal');
	let vocabularyLevel = $state('medium');
	let translationType = $state('balanced');
	let customRules = $state('');

	const models = [
		{ id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
		{ id: 'openai/gpt-4o', name: 'GPT-4o' },
		{ id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
		{ id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' }
	];

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
			<Select bind:value={selectedModel}>
				<SelectTrigger>
					<SelectValue placeholder="انتخاب مدل" />
				</SelectTrigger>
				<SelectContent>
					{#each models as model}
						<SelectItem value={model.id}>{model.name}</SelectItem>
					{/each}
				</SelectContent>
			</Select>
		</CardContent>
	</Card>

	<Card class="mb-6">
		<CardHeader>
			<CardTitle>قوانین ترجمه</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="space-y-2">
				<Label>لحن</Label>
				<Select bind:value={tone}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="formal">رسمی</SelectItem>
						<SelectItem value="informal">غیررسمی</SelectItem>
						<SelectItem value="literary">ادبی</SelectItem>
						<SelectItem value="scientific">علمی</SelectItem>
						<SelectItem value="conversational">محاوره‌ای</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div class="space-y-2">
				<Label>سطح واژگان</Label>
				<Select bind:value={vocabularyLevel}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="simple">ساده</SelectItem>
						<SelectItem value="medium">متوسط</SelectItem>
						<SelectItem value="advanced">پیشرفته</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div class="space-y-2">
				<Label>نوع ترجمه</Label>
				<Select bind:value={translationType}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="literal">تحت‌اللفظی</SelectItem>
						<SelectItem value="balanced">متعادل</SelectItem>
						<SelectItem value="free">آزاد</SelectItem>
					</SelectContent>
				</Select>
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
