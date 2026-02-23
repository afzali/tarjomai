<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { projectsStore } from '$lib/stores/projects.store.js';
	import { settingsStore } from '$lib/stores/settings.store.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Input } from '$lib/components/ui-rtl/input';
	import { Label } from '$lib/components/ui-rtl/label';
	import { Textarea } from '$lib/components/ui-rtl/textarea';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui-rtl/card';
	import * as Select from '$lib/components/ui-rtl/select';

	let title = $state('');
	let description = $state('');
	let sourceLanguage = $state('en');
	let targetLanguage = $state('fa');
	let setupType = $state('guided');
	let creating = $state(false);

	const defaultLanguageItems = [
		{ value: 'en', label: 'انگلیسی' },
		{ value: 'fa', label: 'فارسی' },
		{ value: 'ar', label: 'عربی' },
		{ value: 'de', label: 'آلمانی' },
		{ value: 'fr', label: 'فرانسوی' },
		{ value: 'es', label: 'اسپانیایی' },
		{ value: 'it', label: 'ایتالیایی' },
		{ value: 'ru', label: 'روسی' },
		{ value: 'zh', label: 'چینی' },
		{ value: 'ja', label: 'ژاپنی' },
		{ value: 'tr', label: 'ترکی' }
	];

	let customLanguageItems = $state([]);
	const languageItems = $derived([...defaultLanguageItems, ...customLanguageItems]);

	const sourceLabel = $derived(languageItems.find(l => l.value === sourceLanguage)?.label ?? 'انتخاب زبان');
	const targetLabel = $derived(languageItems.find(l => l.value === targetLanguage)?.label ?? 'انتخاب زبان');

	onMount(async () => {
		const settings = await settingsStore.load();
		if (settings?.defaultSourceLanguage) sourceLanguage = settings.defaultSourceLanguage;
		if (settings?.defaultTargetLanguage) targetLanguage = settings.defaultTargetLanguage;
		if (settings?.customLanguages?.length) customLanguageItems = settings.customLanguages;
	});

	async function createProject() {
		if (!title.trim()) return;
		
		creating = true;
		const project = await projectsStore.create({
			title: title.trim(),
			description: description.trim(),
			sourceLanguage,
			targetLanguage
		});

		if (setupType === 'guided') {
			goto(`/projects/${project.id}/analyze`);
		} else {
			goto(`/projects/${project.id}/quick-setup`);
		}
	}
</script>

<div class="container mx-auto py-8 px-4 max-w-2xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold">پروژه جدید</h1>
		<p class="text-muted-foreground mt-1">ایجاد پروژه ترجمه جدید</p>
	</div>

	<Card>
		<CardHeader>
			<CardTitle>اطلاعات پروژه</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="space-y-2">
				<Label for="title">عنوان پروژه *</Label>
				<Input 
					id="title" 
					bind:value={title}
					placeholder="مثال: ترجمه کتاب..."
				/>
			</div>

			<div class="space-y-2">
				<Label for="description">توضیحات (اختیاری)</Label>
				<Textarea 
					id="description" 
					bind:value={description}
					placeholder="توضیحات کوتاه درباره پروژه..."
					rows={3}
				/>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label>زبان مبدأ</Label>
					<Select.Root type="single" bind:value={sourceLanguage}>
						<Select.Trigger class="w-full">
							{sourceLabel}
						</Select.Trigger>
						<Select.Content>
							{#each languageItems as item (item.value)}
								<Select.Item value={item.value} label={item.label}>
									{item.label}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<Label>زبان مقصد</Label>
					<Select.Root type="single" bind:value={targetLanguage}>
						<Select.Trigger class="w-full">
							{targetLabel}
						</Select.Trigger>
						<Select.Content>
							{#each languageItems as item (item.value)}
								<Select.Item value={item.value} label={item.label}>
									{item.label}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</CardContent>
	</Card>

	<Card class="mt-6">
		<CardHeader>
			<CardTitle>نوع شروع</CardTitle>
			<CardDescription>چگونه می‌خواهید پروژه را شروع کنید؟</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<label class="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors {setupType === 'guided' ? 'border-primary bg-primary/5' : ''}">
				<input type="radio" bind:group={setupType} value="guided" class="mt-1" />
				<div>
					<div class="font-medium">شروع هدایت‌شده (توصیه می‌شود)</div>
					<div class="text-sm text-muted-foreground">
						AI سبک نگارش را تحلیل می‌کند، چند مدل را مقایسه می‌کنید و بهترین را انتخاب می‌کنید
					</div>
				</div>
			</label>

			<label class="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors {setupType === 'quick' ? 'border-primary bg-primary/5' : ''}">
				<input type="radio" bind:group={setupType} value="quick" class="mt-1" />
				<div>
					<div class="font-medium">شروع سریع</div>
					<div class="text-sm text-muted-foreground">
						مستقیماً مدل و قوانین ترجمه را انتخاب کنید و شروع کنید
					</div>
				</div>
			</label>
		</CardContent>
	</Card>

	<div class="mt-6 flex gap-2">
		<Button variant="outline" href="/">
			انصراف
		</Button>
		<Button onclick={createProject} disabled={creating || !title.trim()}>
			{creating ? 'در حال ایجاد...' : 'ایجاد پروژه'}
		</Button>
	</div>
</div>
