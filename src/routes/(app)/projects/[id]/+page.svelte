<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { currentProjectStore } from '$lib/stores/currentProject.store.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Textarea } from '$lib/components/ui-rtl/textarea';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui-rtl/card';

	let projectId = $derived($page.params.id);
	let project = $state(null);
	let chapters = $state([]);
	let selectedChapter = $state(null);
	let loading = $state(true);
	let translating = $state(false);

	onMount(async () => {
		const data = await currentProjectStore.load(parseInt(projectId));
		if (data) {
			project = data.project;
			chapters = data.chapters;
			if (chapters.length > 0) {
				selectedChapter = chapters[0];
			}
		}
		loading = false;
	});

	$effect(() => {
		const unsub = currentProjectStore.subscribe(value => {
			project = value.project;
			chapters = value.chapters;
		});
		return unsub;
	});

	async function addChapter() {
		const title = prompt('عنوان فصل جدید:');
		if (title) {
			const chapter = await currentProjectStore.addChapter({
				title,
				sourceText: '',
				translatedText: ''
			});
			selectedChapter = chapter;
		}
	}

	async function saveChapter() {
		if (!selectedChapter) return;
		await currentProjectStore.updateChapter(selectedChapter.id, {
			sourceText: selectedChapter.sourceText,
			translatedText: selectedChapter.translatedText
		});
	}
</script>

<div class="flex h-screen">
	<!-- Sidebar -->
	<div class="w-64 border-l bg-muted/30 p-4 flex flex-col">
		<div class="flex items-center justify-between mb-4">
			<h2 class="font-semibold">فصل‌ها</h2>
			<Button size="sm" variant="outline" onclick={addChapter}>
				+ فصل جدید
			</Button>
		</div>
		
		<div class="flex-1 overflow-auto space-y-1">
			{#if loading}
				<p class="text-sm text-muted-foreground">در حال بارگذاری...</p>
			{:else if chapters.length === 0}
				<p class="text-sm text-muted-foreground">هنوز فصلی اضافه نشده</p>
			{:else}
				{#each chapters as chapter (chapter.id)}
					<button
						class="w-full text-right px-3 py-2 rounded-md text-sm transition-colors {selectedChapter?.id === chapter.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}"
						onclick={() => selectedChapter = chapter}
					>
						{chapter.title}
					</button>
				{/each}
			{/if}
		</div>

		<div class="pt-4 border-t space-y-2">
			<Button variant="outline" size="sm" class="w-full" href="/projects/{projectId}/rules">
				قوانین ترجمه
			</Button>
			<Button variant="outline" size="sm" class="w-full" href="/">
				بازگشت
			</Button>
		</div>
	</div>

	<!-- Main Content -->
	<div class="flex-1 flex flex-col">
		{#if loading}
			<div class="flex-1 flex items-center justify-center">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		{:else if !project}
			<div class="flex-1 flex items-center justify-center">
				<p class="text-muted-foreground">پروژه یافت نشد</p>
			</div>
		{:else}
			<div class="p-4 border-b flex items-center justify-between">
				<h1 class="text-xl font-bold">{project.title}</h1>
				<div class="flex gap-2">
					<Button variant="outline" onclick={saveChapter}>
						ذخیره
					</Button>
					<Button disabled={translating || !selectedChapter}>
						{translating ? 'در حال ترجمه...' : 'ترجمه این فصل'}
					</Button>
				</div>
			</div>

			{#if selectedChapter}
				<div class="flex-1 grid grid-cols-2 gap-0">
					<!-- Source Text -->
					<div class="border-l p-4 flex flex-col">
						<h3 class="font-medium mb-2">متن اصلی ({project.sourceLanguage})</h3>
						<Textarea 
							bind:value={selectedChapter.sourceText}
							class="flex-1 resize-none font-mono text-sm"
							placeholder="متن اصلی را اینجا وارد کنید..."
							dir="auto"
						/>
					</div>

					<!-- Translated Text -->
					<div class="p-4 flex flex-col">
						<h3 class="font-medium mb-2">ترجمه ({project.targetLanguage})</h3>
						<Textarea 
							bind:value={selectedChapter.translatedText}
							class="flex-1 resize-none font-mono text-sm"
							placeholder="ترجمه اینجا نمایش داده می‌شود..."
							dir="auto"
						/>
					</div>
				</div>
			{:else}
				<div class="flex-1 flex items-center justify-center">
					<p class="text-muted-foreground">یک فصل را انتخاب کنید یا فصل جدید بسازید</p>
				</div>
			{/if}
		{/if}
	</div>
</div>
