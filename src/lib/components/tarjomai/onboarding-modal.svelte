<script>
	import { uiStore } from '$lib/stores/ui.store.js';
	import { settingsStore } from '$lib/stores/settings.store.js';
	import { openrouterService } from '$lib/services/openrouter.service.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Input } from '$lib/components/ui-rtl/input';
	import { Label } from '$lib/components/ui-rtl/label';
	import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '$lib/components/ui-rtl/dialog';

	let apiKey = $state('');
	let testing = $state(false);
	let testResult = $state(null);
	let saving = $state(false);

	async function testConnection() {
		if (!apiKey.trim()) return;
		testing = true;
		testResult = null;
		const result = await openrouterService.testConnection(apiKey);
		testResult = result;
		testing = false;
	}

	async function saveAndClose() {
		if (!apiKey.trim() || !testResult?.success) return;
		saving = true;
		const settings = await settingsStore.load();
		await settingsStore.save({
			...settings,
			openRouterApiKey: apiKey
		});
		saving = false;
		uiStore.setOnboarding(false);
	}

	function skip() {
		uiStore.setOnboarding(false);
	}
</script>

<Dialog open={true}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>به ترجمای خوش آمدید!</DialogTitle>
			<DialogDescription>
				برای استفاده از قابلیت‌های ترجمه، لطفاً کلید API خود را وارد کنید
			</DialogDescription>
		</DialogHeader>

		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="apiKey">کلید OpenRouter API</Label>
				<Input 
					id="apiKey" 
					type="password" 
					bind:value={apiKey}
					placeholder="sk-or-v1-..."
				/>
				<p class="text-xs text-muted-foreground">
					کلید API را از <a href="https://openrouter.ai/keys" target="_blank" class="text-primary underline">openrouter.ai/keys</a> دریافت کنید
				</p>
			</div>

			{#if testResult}
				<p class={testResult.success ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>
					{testResult.success ? '✓ اتصال موفق! می‌توانید ادامه دهید.' : `✗ ${testResult.error}`}
				</p>
			{/if}

			<div class="flex gap-2">
				<Button 
					variant="outline" 
					onclick={testConnection} 
					disabled={testing || !apiKey.trim()}
					class="flex-1"
				>
					{testing ? 'در حال تست...' : 'تست اتصال'}
				</Button>
				<Button 
					onclick={saveAndClose} 
					disabled={saving || !testResult?.success}
					class="flex-1"
				>
					{saving ? 'در حال ذخیره...' : 'ذخیره و ادامه'}
				</Button>
			</div>

			<div class="text-center">
				<button onclick={skip} class="text-sm text-muted-foreground hover:underline">
					بعداً تنظیم می‌کنم
				</button>
			</div>
		</div>
	</DialogContent>
</Dialog>
