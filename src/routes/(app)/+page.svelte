<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { projectsStore } from '$lib/stores/projects.store.js';
	import projectsService from '$lib/services/projects.service.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui-rtl/card';

	let projects = $state([]);
	let loading = $state(true);

	// Export/Import state
	let selectMode = $state(false);
	let selectedIds = $state(new Set());
	let importing = $state(false);
	let exporting = $state(false);

	onMount(async () => {
		projects = await projectsStore.load();
		loading = false;
	});

	$effect(() => {
		const unsub = projectsStore.subscribe(value => {
			projects = value;
		});
		return unsub;
	});

	async function deleteProject(id) {
		if (confirm('آیا از حذف این پروژه مطمئن هستید؟')) {
			await projectsStore.delete(id);
		}
	}

	function formatDate(date) {
		if (!date) return '';
		return new Date(date).toLocaleDateString('fa-IR');
	}

	function toggleSelectMode() {
		selectMode = !selectMode;
		selectedIds = new Set();
	}

	function toggleSelect(id) {
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedIds = next;
	}

	function selectAll() {
		selectedIds = new Set(projects.map(p => p.id));
	}

	function deselectAll() {
		selectedIds = new Set();
	}

	async function exportSelected() {
		if (selectedIds.size === 0) return;
		exporting = true;
		try {
			const ids = [...selectedIds];
			const data = await projectsService.exportProjects(ids);
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			const label = ids.length === 1
				? projects.find(p => p.id === ids[0])?.title || 'project'
				: `tarjomai-${ids.length}-projects`;
			a.download = `${label}.json`;
			a.click();
			URL.revokeObjectURL(url);
		} finally {
			exporting = false;
		}
	}

	async function handleImport(event) {
		const file = event.target.files?.[0];
		if (!file) return;
		importing = true;
		try {
			const text = await file.text();
			const data = JSON.parse(text);
			await projectsService.importProjects(data);
			projects = await projectsStore.load();
			selectMode = false;
			selectedIds = new Set();
		} catch (e) {
			alert('خطا در وارد کردن فایل: ' + e.message);
		} finally {
			importing = false;
			event.target.value = '';
		}
	}
</script>

<div class="container mx-auto py-8 px-4">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-3xl font-bold">ترجمای</h1>
			<p class="text-muted-foreground mt-1">ابزار ترجمه و مقایسه هوشمند متون</p>
		</div>
		<div class="flex gap-2 flex-wrap justify-end">
			<Button variant="outline" href="/settings">تنظیمات</Button>
			{#if !selectMode}
				<Button variant="outline" onclick={toggleSelectMode}>📦 خروجی / ورودی</Button>
				<Button href="/projects/new">پروژه جدید</Button>
			{/if}
		</div>
	</div>

	{#if selectMode}
		<!-- Export/Import toolbar -->
		<div class="mb-6 p-4 rounded-xl border bg-muted/30 flex flex-wrap items-center gap-3">
			<span class="text-sm font-medium">
				{selectedIds.size > 0 ? `${selectedIds.size} کتاب انتخاب شده` : 'کتاب‌ها را انتخاب کنید'}
			</span>
			<div class="flex gap-2 flex-wrap">
				<Button size="sm" variant="outline" onclick={selectAll}>انتخاب همه</Button>
				<Button size="sm" variant="outline" onclick={deselectAll} disabled={selectedIds.size === 0}>لغو انتخاب</Button>
			</div>
			<div class="flex gap-2 flex-wrap mr-auto">
				<Button
					size="sm"
					onclick={exportSelected}
					disabled={selectedIds.size === 0 || exporting}
				>
					{exporting ? 'در حال خروجی...' : '⬇️ خروجی JSON'}
				</Button>
				<label class="cursor-pointer">
					<input type="file" accept=".json" class="hidden" onchange={handleImport} disabled={importing} />
					<span class="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 py-2 {importing ? 'opacity-50 pointer-events-none' : ''}">
						{importing ? 'در حال وارد کردن...' : '⬆️ ورودی JSON'}
					</span>
				</label>
				<Button size="sm" variant="ghost" onclick={toggleSelectMode}>انصراف</Button>
			</div>
		</div>
	{/if}

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
		</div>
	{:else if projects.length === 0}
		<Card class="text-center py-12">
			<CardContent class="pt-6">
				<h2 class="text-xl font-semibold mb-2">هنوز پروژه‌ای ندارید</h2>
				<p class="text-muted-foreground mb-4">اولین پروژه ترجمه خود را ایجاد کنید</p>
				<div class="flex gap-2 justify-center flex-wrap">
					<Button href="/projects/new">ایجاد پروژه جدید</Button>
					<label class="cursor-pointer">
						<input type="file" accept=".json" class="hidden" onchange={handleImport} disabled={importing} />
						<span class="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
							⬆️ وارد کردن از فایل
						</span>
					</label>
				</div>
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each projects as project (project.id)}
				<Card
					class="hover:shadow-md transition-shadow group {selectMode ? 'cursor-pointer' : ''} {selectMode && selectedIds.has(project.id) ? 'ring-2 ring-primary' : ''}"
					onclick={selectMode ? () => toggleSelect(project.id) : undefined}
				>
					<CardHeader class="pb-2">
						<div class="flex items-start justify-between gap-2">
							{#if selectMode}
								<div class="mt-0.5 flex-shrink-0">
									<div class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors {selectedIds.has(project.id) ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'}">
										{#if selectedIds.has(project.id)}<span class="text-xs leading-none">✓</span>{/if}
									</div>
								</div>
							{/if}
							<CardTitle class="text-lg flex-1">{project.title}</CardTitle>
							{#if !selectMode}
								<Button
									variant="ghost"
									size="sm"
									class="opacity-0 group-hover:opacity-100 transition-opacity text-destructive flex-shrink-0"
									onclick={() => deleteProject(project.id)}
								>
									حذف
								</Button>
							{/if}
						</div>
						{#if project.description}
							<p class="text-sm text-muted-foreground">{project.description}</p>
						{/if}
					</CardHeader>
					<CardContent>
						<div class="flex items-center justify-between text-sm text-muted-foreground">
							<span>{project.sourceLanguage} → {project.targetLanguage}</span>
							<span>{formatDate(project.updatedAt)}</span>
						</div>
						{#if project.setupStep && project.setupStep !== 'completed'}
							<div class="mt-2 px-2 py-1 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-300">
								⚡ ویزارد ناقص
							</div>
						{/if}
						{#if !selectMode}
							<div class="mt-4 flex gap-2">
								<Button variant="outline" size="sm" href="/projects/{project.id}">
									ادامه کار
								</Button>
								<Button variant="ghost" size="sm" href="/projects/{project.id}/wizard">
									🧙 مرور ویزارد
								</Button>
							</div>
						{/if}
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</div>
