<script>
	import { onMount } from 'svelte';
	import { settingsStore } from '$lib/stores/settings.store.js';
	import { openrouterService } from '$lib/services/openrouter.service.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Input } from '$lib/components/ui-rtl/input';
	import { Label } from '$lib/components/ui-rtl/label';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui-rtl/card';
	import * as Select from '$lib/components/ui-rtl/select';

	let settings = $state(null);
	let apiKey = $state('');
	let uiLanguage = $state('fa');
	let defaultSourceLanguage = $state('en');
	let defaultTargetLanguage = $state('fa');
	let testing = $state(false);
	let testResult = $state(null);
	let saving = $state(false);
	let credits = $state(null);
	let loadingCredits = $state(false);

	const languageItems = [
		{ value: 'en', label: 'انگلیسی' },
		{ value: 'fa', label: 'فارسی' },
		{ value: 'ar', label: 'عربی' },
		{ value: 'de', label: 'آلمانی' },
		{ value: 'fr', label: 'فرانسوی' }
	];

	const uiLanguageItems = [
		{ value: 'fa', label: 'فارسی' },
		{ value: 'en', label: 'English' }
	];

	const uiLangLabel = $derived(uiLanguageItems.find(l => l.value === uiLanguage)?.label ?? 'انتخاب زبان');
	const sourceLangLabel = $derived(languageItems.find(l => l.value === defaultSourceLanguage)?.label ?? 'انتخاب زبان');
	const targetLangLabel = $derived(languageItems.find(l => l.value === defaultTargetLanguage)?.label ?? 'انتخاب زبان');

	onMount(async () => {
		settings = await settingsStore.load();
		apiKey = settings?.openRouterApiKey || '';
		uiLanguage = settings?.uiLanguage || 'fa';
		defaultSourceLanguage = settings?.defaultSourceLanguage || 'en';
		defaultTargetLanguage = settings?.defaultTargetLanguage || 'fa';
		
		if (apiKey) {
			loadCredits();
		}
	});

	async function loadCredits() {
		if (!apiKey) return;
		loadingCredits = true;
		credits = await openrouterService.getCredits(apiKey);
		loadingCredits = false;
	}

	async function testConnection() {
		testing = true;
		testResult = null;
		const result = await openrouterService.testConnection(apiKey);
		testResult = result;
		testing = false;
	}

	async function saveSettings() {
		saving = true;
		await settingsStore.save({
			...settings,
			openRouterApiKey: apiKey,
			uiLanguage,
			defaultSourceLanguage,
			defaultTargetLanguage
		});
		saving = false;
	}

	async function clearAllData() {
		if (confirm('آیا از حذف تمام داده‌ها مطمئن هستید؟ این عمل قابل بازگشت نیست.')) {
			await settingsStore.clearAll();
			window.location.reload();
		}
	}
</script>

<div class="container mx-auto py-8 px-4 max-w-2xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold">تنظیمات</h1>
		<p class="text-muted-foreground mt-1">پیکربندی برنامه ترجمای</p>
	</div>

	<div class="space-y-6">
		<Card>
			<CardHeader>
				<CardTitle>OpenRouter API</CardTitle>
				<CardDescription>کلید API برای اتصال به مدل‌های هوش مصنوعی</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-2">
					<Label for="apiKey">کلید API</Label>
					<Input 
						id="apiKey" 
						type="password" 
						bind:value={apiKey}
						placeholder="sk-or-v1-..."
					/>
				</div>
				<div class="flex gap-2">
					<Button variant="outline" onclick={testConnection} disabled={testing || !apiKey}>
						{testing ? 'در حال تست...' : 'تست اتصال'}
					</Button>
					<Button onclick={saveSettings} disabled={saving}>
						{saving ? 'در حال ذخیره...' : 'ذخیره'}
					</Button>
				</div>
				{#if testResult}
					<p class={testResult.success ? 'text-green-600' : 'text-red-600'}>
						{testResult.success ? '✓ اتصال موفق' : `✗ ${testResult.error}`}
					</p>
				{/if}
			</CardContent>
		</Card>

		{#if apiKey}
			<Card>
				<CardHeader>
					<CardTitle>مصرف و اعتبار</CardTitle>
					<CardDescription>وضعیت اعتبار OpenRouter شما</CardDescription>
				</CardHeader>
				<CardContent>
					{#if loadingCredits}
						<p class="text-muted-foreground">در حال بارگذاری...</p>
					{:else if credits?.success}
						<div class="grid grid-cols-3 gap-4 text-center">
							<div class="p-4 bg-muted rounded-lg">
								<p class="text-2xl font-bold text-green-600">${credits.totalCredits.toFixed(2)}</p>
								<p class="text-sm text-muted-foreground">کل اعتبار</p>
							</div>
							<div class="p-4 bg-muted rounded-lg">
								<p class="text-2xl font-bold text-red-600">${credits.totalUsage.toFixed(4)}</p>
								<p class="text-sm text-muted-foreground">مصرف شده</p>
							</div>
							<div class="p-4 bg-muted rounded-lg">
								<p class="text-2xl font-bold text-blue-600">${credits.remaining.toFixed(4)}</p>
								<p class="text-sm text-muted-foreground">باقی‌مانده</p>
							</div>
						</div>
						<Button variant="outline" class="mt-4" onclick={loadCredits}>
							به‌روزرسانی
						</Button>
					{:else if credits?.error}
						<p class="text-red-600">{credits.error}</p>
					{:else}
						<Button variant="outline" onclick={loadCredits}>
							مشاهده اعتبار
						</Button>
					{/if}
				</CardContent>
			</Card>
		{/if}

		<Card>
			<CardHeader>
				<CardTitle>زبان رابط کاربری</CardTitle>
			</CardHeader>
			<CardContent>
				<Select.Root type="single" bind:value={uiLanguage}>
					<Select.Trigger class="w-full">
						{uiLangLabel}
					</Select.Trigger>
					<Select.Content>
						{#each uiLanguageItems as item (item.value)}
							<Select.Item value={item.value} label={item.label}>{item.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>زبان‌های پیش‌فرض</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label>زبان مبدأ</Label>
						<Select.Root type="single" bind:value={defaultSourceLanguage}>
							<Select.Trigger class="w-full">
								{sourceLangLabel}
							</Select.Trigger>
							<Select.Content>
								{#each languageItems as item (item.value)}
									<Select.Item value={item.value} label={item.label}>{item.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<div class="space-y-2">
						<Label>زبان مقصد</Label>
						<Select.Root type="single" bind:value={defaultTargetLanguage}>
							<Select.Trigger class="w-full">
								{targetLangLabel}
							</Select.Trigger>
							<Select.Content>
								{#each languageItems as item (item.value)}
									<Select.Item value={item.value} label={item.label}>{item.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>
			</CardContent>
		</Card>

		<Card class="border-destructive">
			<CardHeader>
				<CardTitle class="text-destructive">منطقه خطرناک</CardTitle>
			</CardHeader>
			<CardContent>
				<Button variant="destructive" onclick={clearAllData}>
					حذف تمام داده‌ها
				</Button>
			</CardContent>
		</Card>
	</div>

	<div class="mt-6">
		<Button variant="outline" href="/">
			بازگشت به داشبورد
		</Button>
	</div>
</div>
