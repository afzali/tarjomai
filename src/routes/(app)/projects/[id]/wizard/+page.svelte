<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { currentProjectStore } from '$lib/stores/currentProject.store.js';
	import projectsService from '$lib/services/projects.service.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui-rtl/card';
	import * as Tabs from '$lib/components/ui-rtl/tabs';

	let projectId = $derived($page.params.id);
	let project = $state(null);
	let wizardData = $state(null);
	let rules = $state(null);
	let loading = $state(true);
	let activeTab = $state('analyze');

	const toneLabels = {
		formal: 'رسمی',
		informal: 'غیررسمی',
		literary: 'ادبی',
		scientific: 'علمی',
		conversational: 'محاوره‌ای'
	};

	const vocabularyLabels = {
		simple: 'ساده',
		medium: 'متوسط',
		advanced: 'پیشرفته'
	};

	const structureLabels = {
		short: 'کوتاه',
		medium: 'متوسط',
		long: 'بلند',
		mixed: 'ترکیبی'
	};

	const translationTypeLabels = {
		literal: 'تحت‌اللفظی',
		balanced: 'متعادل',
		free: 'آزاد'
	};

	onMount(async () => {
		const data = await currentProjectStore.load(parseInt(projectId));
		if (data) {
			project = data.project;
			rules = data.rules;
			wizardData = project?.wizardData || null;
		}
		loading = false;
	});

	function goToStep(step) {
		const urls = {
			analyze: `/projects/${projectId}/analyze`,
			compare: `/projects/${projectId}/compare`
		};
		goto(urls[step] || `/projects/${projectId}`);
	}
</script>

<div class="container mx-auto py-8 px-4 max-w-4xl">
	<div class="flex items-center justify-between mb-8">
		<div>
			<h1 class="text-3xl font-bold">🧙 مرور ویزارد</h1>
			<p class="text-muted-foreground mt-1">
				مشاهده تنظیمات و نتایج ذخیره شده در هر مرحله
			</p>
		</div>
		<Button variant="outline" href="/projects/{projectId}">
			← بازگشت به پروژه
		</Button>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
		</div>
	{:else}
		<Tabs.Root value={activeTab} onValueChange={(v) => activeTab = v || 'analyze'} class="space-y-6">
			<Tabs.List class="grid w-full grid-cols-3">
				<Tabs.Trigger value="analyze">📝 تحلیل سبک</Tabs.Trigger>
				<Tabs.Trigger value="compare">🔄 مقایسه مدل‌ها</Tabs.Trigger>
				<Tabs.Trigger value="rules">📋 قوانین نهایی</Tabs.Trigger>
			</Tabs.List>

			<!-- Analyze Tab -->
			<Tabs.Content value="analyze">
				<Card>
					<CardHeader>
						<div class="flex items-center justify-between">
							<CardTitle>تحلیل سبک</CardTitle>
							<Button variant="outline" size="sm" onclick={() => goToStep('analyze')}>
								ویرایش ←
							</Button>
						</div>
						<CardDescription>نتایج تحلیل سبک متن نمونه</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						{#if wizardData?.analyze}
							{#if wizardData.analyze.sampleText}
								<div>
									<h4 class="font-medium mb-2">متن نمونه:</h4>
									<div class="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-40 overflow-auto">
										{wizardData.analyze.sampleText}
									</div>
								</div>
							{/if}

							{#if wizardData.analyze.editableTone?.length > 0}
								<div>
									<h4 class="font-medium mb-2">لحن:</h4>
									<div class="flex flex-wrap gap-2">
										{#each wizardData.analyze.editableTone as t}
											<span class="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
												{toneLabels[t] || t}
											</span>
										{/each}
									</div>
								</div>
							{/if}

							<div class="grid grid-cols-2 gap-4">
								{#if wizardData.analyze.editableVocabulary}
									<div>
										<h4 class="font-medium mb-1">سطح واژگان:</h4>
										<span class="text-muted-foreground">{vocabularyLabels[wizardData.analyze.editableVocabulary] || wizardData.analyze.editableVocabulary}</span>
									</div>
								{/if}
								{#if wizardData.analyze.editableStructure}
									<div>
										<h4 class="font-medium mb-1">ساختار جمله:</h4>
										<span class="text-muted-foreground">{structureLabels[wizardData.analyze.editableStructure] || wizardData.analyze.editableStructure}</span>
									</div>
								{/if}
								{#if wizardData.analyze.editableTranslationType}
									<div>
										<h4 class="font-medium mb-1">نوع ترجمه:</h4>
										<span class="text-muted-foreground">{translationTypeLabels[wizardData.analyze.editableTranslationType] || wizardData.analyze.editableTranslationType}</span>
									</div>
								{/if}
							</div>

							{#if wizardData.analyze.editableCustomRules}
								<div>
									<h4 class="font-medium mb-2">قوانین سفارشی:</h4>
									<div class="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
										{wizardData.analyze.editableCustomRules}
									</div>
								</div>
							{/if}
						{:else}
							<p class="text-muted-foreground text-center py-8">هنوز داده‌ای ذخیره نشده است</p>
						{/if}
					</CardContent>
				</Card>
			</Tabs.Content>

			<!-- Compare Tab -->
			<Tabs.Content value="compare">
				<Card>
					<CardHeader>
						<div class="flex items-center justify-between">
							<CardTitle>مقایسه مدل‌ها</CardTitle>
							<Button variant="outline" size="sm" onclick={() => goToStep('compare')}>
								ویرایش ←
							</Button>
						</div>
						<CardDescription>نتایج مقایسه و داوری مدل‌ها</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						{#if wizardData?.compare}
							{#if wizardData.compare.sampleText}
								<div>
									<h4 class="font-medium mb-2">متن نمونه برای مقایسه:</h4>
									<div class="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-40 overflow-auto">
										{wizardData.compare.sampleText}
									</div>
								</div>
							{/if}

							{#if wizardData.compare.results?.length > 0}
								<div>
									<h4 class="font-medium mb-2">نتایج ترجمه:</h4>
									<div class="space-y-3">
										{#each wizardData.compare.results as result}
											<div class="p-3 border rounded-lg">
												<div class="flex items-center justify-between mb-2">
													<span class="font-mono text-sm font-medium">{result.model}</span>
													{#if result.rating}
														<span class="text-amber-500">
															{'⭐'.repeat(result.rating)}
														</span>
													{/if}
												</div>
												{#if result.translation}
													<p class="text-sm text-muted-foreground whitespace-pre-wrap">{result.translation}</p>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							{/if}

							{#if wizardData.compare.judgeResults}
								<div>
									<h4 class="font-medium mb-2">نتایج داوری:</h4>
									<div class="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
										{#if wizardData.compare.judgeResults.summary}
											<p class="text-sm mb-2">{wizardData.compare.judgeResults.summary}</p>
										{/if}
										{#if wizardData.compare.judgeResults.recommendation}
											<p class="text-sm font-medium text-green-700 dark:text-green-300">
												پیشنهاد داور: {wizardData.compare.judgeResults.recommendation}
											</p>
										{/if}
									</div>
								</div>
							{/if}
						{:else}
							<p class="text-muted-foreground text-center py-8">هنوز داده‌ای ذخیره نشده است</p>
						{/if}
					</CardContent>
				</Card>
			</Tabs.Content>

			<!-- Rules Tab -->
			<Tabs.Content value="rules">
				<Card>
					<CardHeader>
						<div class="flex items-center justify-between">
							<CardTitle>قوانین نهایی</CardTitle>
							<Button variant="outline" size="sm" href="/projects/{projectId}/rules">
								ویرایش ←
							</Button>
						</div>
						<CardDescription>قوانین ترجمه ذخیره شده برای این پروژه</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						{#if rules}
							{#if rules.tone?.length > 0}
								<div>
									<h4 class="font-medium mb-2">لحن:</h4>
									<div class="flex flex-wrap gap-2">
										{#each rules.tone as t}
											<span class="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
												{toneLabels[t] || t}
											</span>
										{/each}
									</div>
								</div>
							{/if}

							<div class="grid grid-cols-2 gap-4">
								{#if rules.vocabularyLevel}
									<div>
										<h4 class="font-medium mb-1">سطح واژگان:</h4>
										<span class="text-muted-foreground">{vocabularyLabels[rules.vocabularyLevel] || rules.vocabularyLevel}</span>
									</div>
								{/if}
								{#if rules.translationType}
									<div>
										<h4 class="font-medium mb-1">نوع ترجمه:</h4>
										<span class="text-muted-foreground">{translationTypeLabels[rules.translationType] || rules.translationType}</span>
									</div>
								{/if}
							</div>

							{#if rules.customRules?.length > 0}
								<div>
									<h4 class="font-medium mb-2">قوانین سفارشی:</h4>
									<ul class="list-disc list-inside space-y-1">
										{#each rules.customRules as rule}
											<li class="text-sm text-muted-foreground">{rule}</li>
										{/each}
									</ul>
								</div>
							{/if}
						{:else}
							<p class="text-muted-foreground text-center py-8">هنوز قوانینی ذخیره نشده است</p>
						{/if}
					</CardContent>
				</Card>
			</Tabs.Content>
		</Tabs.Root>

		<!-- Project Info -->
		<Card class="mt-6">
			<CardHeader>
				<CardTitle>اطلاعات پروژه</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<span class="text-muted-foreground">عنوان:</span>
						<span class="font-medium mr-2">{project?.title || '-'}</span>
					</div>
					<div>
						<span class="text-muted-foreground">زبان‌ها:</span>
						<span class="font-medium mr-2">{project?.sourceLanguage} → {project?.targetLanguage}</span>
					</div>
					<div>
						<span class="text-muted-foreground">مدل پیش‌فرض:</span>
						<span class="font-medium mr-2 font-mono text-xs">{project?.defaultModel || '-'}</span>
					</div>
					<div>
						<span class="text-muted-foreground">وضعیت ویزارد:</span>
						<span class="font-medium mr-2">{project?.setupStep === 'completed' ? '✅ تکمیل شده' : '⏳ در حال انجام'}</span>
					</div>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>
