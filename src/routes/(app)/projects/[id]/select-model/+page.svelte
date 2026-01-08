<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { currentProjectStore } from '$lib/stores/currentProject.store.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui-rtl/card';

	let projectId = $derived($page.params.id);
	let selectedModel = $derived($page.url.searchParams.get('model') || '');
	let project = $state(null);
	let saving = $state(false);

	onMount(async () => {
		const data = await currentProjectStore.load(parseInt(projectId));
		if (data) {
			project = data.project;
		}
	});

	async function saveAndContinue() {
		saving = true;
		await currentProjectStore.updateProject({
			defaultModel: selectedModel
		});
		goto(`/projects/${projectId}`);
	}
</script>

<div class="container mx-auto py-8 px-4 max-w-2xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold">انتخاب مدل نهایی</h1>
		<p class="text-muted-foreground mt-1">
			مدل انتخاب‌شده برای ترجمه پروژه
		</p>
	</div>

	<Card>
		<CardHeader>
			<CardTitle>مدل انتخاب‌شده</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if selectedModel}
				<div class="p-4 bg-primary/10 rounded-lg border border-primary">
					<p class="font-medium">{selectedModel}</p>
					<p class="text-sm text-muted-foreground mt-1">
						این مدل برای ترجمه تمام فصل‌های پروژه استفاده خواهد شد
					</p>
				</div>
			{:else}
				<p class="text-muted-foreground">هیچ مدلی انتخاب نشده است</p>
			{/if}

			<p class="text-sm text-muted-foreground">
				می‌توانید بعداً برای هر فصل مدل متفاوتی انتخاب کنید (Override)
			</p>
		</CardContent>
	</Card>

	<div class="mt-6 flex gap-2">
		<Button variant="outline" href="/projects/{projectId}/compare">
			بازگشت به مقایسه
		</Button>
		<Button onclick={saveAndContinue} disabled={saving || !selectedModel}>
			{saving ? 'در حال ذخیره...' : 'ذخیره و رفتن به Workspace'}
		</Button>
	</div>
</div>
