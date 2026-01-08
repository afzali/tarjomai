<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { projectsStore } from '$lib/stores/projects.store.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui-rtl/card';

	let projects = $state([]);
	let loading = $state(true);

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
</script>

<div class="container mx-auto py-8 px-4">
	<div class="flex items-center justify-between mb-8">
		<div>
			<h1 class="text-3xl font-bold">ترجمای</h1>
			<p class="text-muted-foreground mt-1">ابزار ترجمه و مقایسه هوشمند متون</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" href="/settings">
				تنظیمات
			</Button>
			<Button href="/projects/new">
				پروژه جدید
			</Button>
		</div>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
		</div>
	{:else if projects.length === 0}
		<Card class="text-center py-12">
			<CardContent class="pt-6">
				<h2 class="text-xl font-semibold mb-2">هنوز پروژه‌ای ندارید</h2>
				<p class="text-muted-foreground mb-4">اولین پروژه ترجمه خود را ایجاد کنید</p>
				<Button href="/projects/new">
					ایجاد پروژه جدید
				</Button>
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each projects as project (project.id)}
				<Card class="hover:shadow-md transition-shadow cursor-pointer group">
					<CardHeader class="pb-2">
						<div class="flex items-start justify-between">
							<CardTitle class="text-lg">{project.title}</CardTitle>
							<Button 
								variant="ghost" 
								size="sm"
								class="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
								onclick={() => deleteProject(project.id)}
							>
								حذف
							</Button>
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
						<div class="mt-4 flex gap-2">
							<Button variant="outline" size="sm" href="/projects/{project.id}">
								ادامه کار
							</Button>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</div>
