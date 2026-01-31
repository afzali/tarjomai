<script>
	import { onMount } from 'svelte';
	import { usageService } from '$lib/services/usage.service.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Input } from '$lib/components/ui-rtl/input';
	import { Label } from '$lib/components/ui-rtl/label';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui-rtl/card';
	import * as Select from '$lib/components/ui-rtl/select';

	let records = $state([]);
	let filteredRecords = $state([]);
	let loading = $state(true);
	let searchQuery = $state('');
	let selectedModel = $state('');
	let startDate = $state('');
	let endDate = $state('');
	let availableModels = $state([]);
	let selectedRecord = $state(null);

	// Pagination
	let currentPage = $state(1);
	let pageSize = 20;
	const totalPages = $derived(Math.ceil(filteredRecords.length / pageSize));
	const paginatedRecords = $derived(
		filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	// Stats
	const totalTokens = $derived(filteredRecords.reduce((sum, r) => sum + (r.totalTokens || 0), 0));
	const totalCost = $derived(filteredRecords.reduce((sum, r) => sum + (r.cost || 0), 0));

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		records = await usageService.getAllHistory();
		availableModels = await usageService.getUniqueModels();
		applyFilters();
		loading = false;
	}

	function applyFilters() {
		let result = [...records];

		// Search by model name
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter(r => r.model?.toLowerCase().includes(query));
		}

		// Filter by model
		if (selectedModel) {
			result = result.filter(r => r.model === selectedModel);
		}

		// Filter by date range
		if (startDate) {
			result = result.filter(r => new Date(r.timestamp) >= new Date(startDate));
		}
		if (endDate) {
			const end = new Date(endDate);
			end.setHours(23, 59, 59, 999);
			result = result.filter(r => new Date(r.timestamp) <= end);
		}

		filteredRecords = result;
		currentPage = 1;
	}

	function clearFilters() {
		searchQuery = '';
		selectedModel = '';
		startDate = '';
		endDate = '';
		applyFilters();
	}

	function formatDate(timestamp) {
		if (!timestamp) return '-';
		return new Date(timestamp).toLocaleString('fa-IR');
	}

	function formatNumber(num) {
		if (!num) return '0';
		return num.toLocaleString('fa-IR');
	}

	function showDetails(record) {
		selectedRecord = record;
	}

	function closeDetails() {
		selectedRecord = null;
	}

	const modelLabel = $derived(
		selectedModel ? availableModels.find(m => m === selectedModel) || 'انتخاب مدل' : 'همه مدل‌ها'
	);
</script>

<div class="container mx-auto py-8 px-4 max-w-6xl">
	<div class="flex items-center justify-between mb-8">
		<div>
			<h1 class="text-3xl font-bold">تاریخچه مصرف</h1>
			<p class="text-muted-foreground mt-1">جزئیات تمام درخواست‌های API</p>
		</div>
		<Button variant="outline" href="/settings">
			← بازگشت به تنظیمات
		</Button>
	</div>

	<!-- Filters -->
	<Card class="mb-6">
		<CardHeader>
			<CardTitle>فیلتر و جستجو</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<div class="space-y-2">
					<Label>جستجو</Label>
					<Input 
						bind:value={searchQuery}
						placeholder="نام مدل..."
						oninput={applyFilters}
					/>
				</div>

				<div class="space-y-2">
					<Label>مدل</Label>
					<Select.Root type="single" value={selectedModel} onValueChange={(v) => { selectedModel = v || ''; applyFilters(); }}>
						<Select.Trigger class="w-full">
							{modelLabel}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="" label="همه مدل‌ها">همه مدل‌ها</Select.Item>
							{#each availableModels as model}
								<Select.Item value={model} label={model}>{model}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-2">
					<Label>از تاریخ</Label>
					<Input 
						type="date"
						bind:value={startDate}
						onchange={applyFilters}
					/>
				</div>

				<div class="space-y-2">
					<Label>تا تاریخ</Label>
					<Input 
						type="date"
						bind:value={endDate}
						onchange={applyFilters}
					/>
				</div>
			</div>

			<div class="flex items-center justify-between mt-4">
				<Button variant="outline" size="sm" onclick={clearFilters}>
					پاک کردن فیلترها
				</Button>
				<div class="text-sm text-muted-foreground">
					{formatNumber(filteredRecords.length)} رکورد یافت شد
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Stats Summary -->
	<div class="grid gap-4 md:grid-cols-3 mb-6">
		<Card>
			<CardContent class="pt-6">
				<div class="text-2xl font-bold">{formatNumber(filteredRecords.length)}</div>
				<p class="text-sm text-muted-foreground">تعداد درخواست</p>
			</CardContent>
		</Card>
		<Card>
			<CardContent class="pt-6">
				<div class="text-2xl font-bold">{formatNumber(totalTokens)}</div>
				<p class="text-sm text-muted-foreground">مجموع توکن‌ها</p>
			</CardContent>
		</Card>
		<Card>
			<CardContent class="pt-6">
				<div class="text-2xl font-bold">${totalCost.toFixed(4)}</div>
				<p class="text-sm text-muted-foreground">مجموع هزینه</p>
			</CardContent>
		</Card>
	</div>

	<!-- Records Table -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
		</div>
	{:else if filteredRecords.length === 0}
		<Card class="text-center py-12">
			<CardContent>
				<p class="text-muted-foreground">هیچ رکوردی یافت نشد</p>
			</CardContent>
		</Card>
	{:else}
		<Card>
			<CardContent class="p-0">
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-muted/50">
							<tr>
								<th class="text-right p-3 font-medium">تاریخ</th>
								<th class="text-right p-3 font-medium">مدل</th>
								<th class="text-right p-3 font-medium">توکن ورودی</th>
								<th class="text-right p-3 font-medium">توکن خروجی</th>
								<th class="text-right p-3 font-medium">مجموع</th>
								<th class="text-right p-3 font-medium">هزینه</th>
								<th class="text-right p-3 font-medium">عملیات</th>
							</tr>
						</thead>
						<tbody>
							{#each paginatedRecords as record}
								<tr class="border-t hover:bg-muted/30 transition-colors">
									<td class="p-3 text-sm">{formatDate(record.timestamp)}</td>
									<td class="p-3 text-sm font-mono">{record.model}</td>
									<td class="p-3 text-sm">{formatNumber(record.promptTokens)}</td>
									<td class="p-3 text-sm">{formatNumber(record.completionTokens)}</td>
									<td class="p-3 text-sm font-medium">{formatNumber(record.totalTokens)}</td>
									<td class="p-3 text-sm">${(record.cost || 0).toFixed(6)}</td>
									<td class="p-3">
										<Button variant="ghost" size="sm" onclick={() => showDetails(record)}>
											جزئیات
										</Button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Pagination -->
				{#if totalPages > 1}
					<div class="flex items-center justify-between p-4 border-t">
						<div class="text-sm text-muted-foreground">
							صفحه {currentPage} از {totalPages}
						</div>
						<div class="flex gap-2">
							<Button 
								variant="outline" 
								size="sm" 
								disabled={currentPage === 1}
								onclick={() => currentPage--}
							>
								قبلی
							</Button>
							<Button 
								variant="outline" 
								size="sm" 
								disabled={currentPage === totalPages}
								onclick={() => currentPage++}
							>
								بعدی
							</Button>
						</div>
					</div>
				{/if}
			</CardContent>
		</Card>
	{/if}
</div>

<!-- Details Modal -->
{#if selectedRecord}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={closeDetails}>
		<div class="bg-background rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-auto" onclick={(e) => e.stopPropagation()}>
			<div class="p-6">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-xl font-bold">جزئیات درخواست</h2>
					<button class="text-muted-foreground hover:text-foreground" onclick={closeDetails}>✕</button>
				</div>

				<div class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<Label class="text-muted-foreground">تاریخ و زمان</Label>
							<p class="font-medium">{formatDate(selectedRecord.timestamp)}</p>
						</div>
						<div>
							<Label class="text-muted-foreground">مدل</Label>
							<p class="font-medium font-mono text-sm">{selectedRecord.model}</p>
						</div>
					</div>

					<div class="grid grid-cols-3 gap-4">
						<div>
							<Label class="text-muted-foreground">توکن ورودی</Label>
							<p class="font-medium">{formatNumber(selectedRecord.promptTokens)}</p>
						</div>
						<div>
							<Label class="text-muted-foreground">توکن خروجی</Label>
							<p class="font-medium">{formatNumber(selectedRecord.completionTokens)}</p>
						</div>
						<div>
							<Label class="text-muted-foreground">مجموع توکن</Label>
							<p class="font-medium">{formatNumber(selectedRecord.totalTokens)}</p>
						</div>
					</div>

					<div>
						<Label class="text-muted-foreground">هزینه</Label>
						<p class="font-medium text-lg">${(selectedRecord.cost || 0).toFixed(6)}</p>
					</div>

					{#if selectedRecord.projectId}
						<div>
							<Label class="text-muted-foreground">پروژه</Label>
							<p class="font-medium">#{selectedRecord.projectId}</p>
						</div>
					{/if}
				</div>

				<div class="mt-6">
					<Button variant="outline" class="w-full" onclick={closeDetails}>
						بستن
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
