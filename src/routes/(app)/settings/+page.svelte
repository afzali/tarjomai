<script>
	import { onMount } from 'svelte';
	import { settingsStore } from '$lib/stores/settings.store.js';
	import { openrouterService } from '$lib/services/openrouter.service.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Input } from '$lib/components/ui-rtl/input';
	import { Label } from '$lib/components/ui-rtl/label';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui-rtl/card';
	import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui-rtl/select';

	let settings = $state(null);
	let apiKey = $state('');
	let testing = $state(false);
	let testResult = $state(null);
	let saving = $state(false);

	onMount(async () => {
		settings = await settingsStore.load();
		apiKey = settings?.openRouterApiKey || '';
	});

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
			openRouterApiKey: apiKey
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

		<Card>
			<CardHeader>
				<CardTitle>زبان رابط کاربری</CardTitle>
			</CardHeader>
			<CardContent>
				<Select bind:value={settings.uiLanguage}>
					<SelectTrigger>
						<SelectValue placeholder="انتخاب زبان" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="fa">فارسی</SelectItem>
						<SelectItem value="en">English</SelectItem>
					</SelectContent>
				</Select>
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
						<Select bind:value={settings.defaultSourceLanguage}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="en">انگلیسی</SelectItem>
								<SelectItem value="fa">فارسی</SelectItem>
								<SelectItem value="ar">عربی</SelectItem>
								<SelectItem value="de">آلمانی</SelectItem>
								<SelectItem value="fr">فرانسوی</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div class="space-y-2">
						<Label>زبان مقصد</Label>
						<Select bind:value={settings.defaultTargetLanguage}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="fa">فارسی</SelectItem>
								<SelectItem value="en">انگلیسی</SelectItem>
								<SelectItem value="ar">عربی</SelectItem>
								<SelectItem value="de">آلمانی</SelectItem>
								<SelectItem value="fr">فرانسوی</SelectItem>
							</SelectContent>
						</Select>
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
