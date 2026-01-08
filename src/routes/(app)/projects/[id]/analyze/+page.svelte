<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { currentProjectStore } from '$lib/stores/currentProject.store.js';
	import { settingsStore } from '$lib/stores/settings.store.js';
	import { openrouterService } from '$lib/services/openrouter.service.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Textarea } from '$lib/components/ui-rtl/textarea';
	import { Label } from '$lib/components/ui-rtl/label';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui-rtl/card';
	import { Checkbox } from '$lib/components/ui-rtl/checkbox';

	let projectId = $derived($page.params.id);
	let project = $state(null);
	let sampleText = $state('');
	let analyzing = $state(false);
	let analysisResult = $state(null);
	let settings = $state(null);

	let analyzeOptions = $state({
		tone: true,
		vocabulary: true,
		structure: true,
		style: true
	});

	onMount(async () => {
		const data = await currentProjectStore.load(parseInt(projectId));
		if (data) {
			project = data.project;
		}
		settings = await settingsStore.load();
	});

	async function analyzeStyle() {
		if (!sampleText.trim() || !settings?.openRouterApiKey) return;
		
		analyzing = true;
		analysisResult = null;

		const prompt = `Analyze the writing style of the following text and provide a JSON response with these fields:
- tone: array of tones (formal, informal, literary, scientific, conversational)
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
			settings.defaultModels?.styleAnalysis || 'anthropic/claude-3.5-sonnet',
			[{ role: 'user', content: prompt }]
		);

		if (result.success) {
			try {
				analysisResult = JSON.parse(result.content);
			} catch {
				analysisResult = { error: 'خطا در پردازش نتیجه', raw: result.content };
			}
		} else {
			analysisResult = { error: result.error };
		}

		analyzing = false;
	}

	async function saveAndContinue() {
		if (!analysisResult || analysisResult.error) return;
		
		await currentProjectStore.saveRules({
			name: 'تحلیل خودکار',
			...analysisResult
		});

		goto(`/projects/${projectId}/compare`);
	}
</script>

<div class="container mx-auto py-8 px-4 max-w-4xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold">تحلیل سبک نگارش</h1>
		<p class="text-muted-foreground mt-1">
			یک نمونه متن وارد کنید تا AI سبک نگارش را تحلیل کند
		</p>
	</div>

	<Card class="mb-6">
		<CardHeader>
			<CardTitle>متن نمونه</CardTitle>
			<CardDescription>
				یک پاراگراف یا بخش نمونه از متنی که می‌خواهید ترجمه کنید وارد کنید
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
		<Card class="mb-6">
			<CardHeader>
				<CardTitle>نتیجه تحلیل</CardTitle>
			</CardHeader>
			<CardContent>
				{#if analysisResult.error}
					<p class="text-red-600">{analysisResult.error}</p>
					{#if analysisResult.raw}
						<pre class="mt-2 p-4 bg-muted rounded text-sm overflow-auto">{analysisResult.raw}</pre>
					{/if}
				{:else}
					<div class="space-y-4">
						{#if analysisResult.tone}
							<div>
								<Label>لحن</Label>
								<p class="text-sm">{analysisResult.tone.join('، ')}</p>
							</div>
						{/if}
						{#if analysisResult.vocabularyLevel}
							<div>
								<Label>سطح واژگان</Label>
								<p class="text-sm">{analysisResult.vocabularyLevel}</p>
							</div>
						{/if}
						{#if analysisResult.sentenceStructure}
							<div>
								<Label>ساختار جمله</Label>
								<p class="text-sm">{analysisResult.sentenceStructure}</p>
							</div>
						{/if}
						{#if analysisResult.translationType}
							<div>
								<Label>نوع ترجمه پیشنهادی</Label>
								<p class="text-sm">{analysisResult.translationType}</p>
							</div>
						{/if}
						{#if analysisResult.customRules?.length > 0}
							<div>
								<Label>قوانین سفارشی</Label>
								<ul class="text-sm list-disc list-inside">
									{#each analysisResult.customRules as rule}
										<li>{rule}</li>
									{/each}
								</ul>
							</div>
						{/if}
					</div>
				{/if}
			</CardContent>
		</Card>
	{/if}

	<div class="flex gap-2">
		<Button variant="outline" href="/">
			انصراف
		</Button>
		<Button variant="outline" href="/projects/{projectId}/quick-setup">
			رد شدن از تحلیل
		</Button>
		{#if analysisResult && !analysisResult.error}
			<Button onclick={saveAndContinue}>
				ذخیره و ادامه به مقایسه مدل‌ها
			</Button>
		{/if}
	</div>
</div>
