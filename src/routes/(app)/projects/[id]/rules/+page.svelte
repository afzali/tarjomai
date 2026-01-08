<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { currentProjectStore } from '$lib/stores/currentProject.store.js';
	import { rulesService } from '$lib/services/rules.service.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Input } from '$lib/components/ui-rtl/input';
	import { Label } from '$lib/components/ui-rtl/label';
	import { Textarea } from '$lib/components/ui-rtl/textarea';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui-rtl/card';
	import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui-rtl/select';

	let projectId = $derived($page.params.id);
	let project = $state(null);
	let rules = $state(null);
	let presets = $state([]);
	let saving = $state(false);

	let tone = $state('formal');
	let vocabularyLevel = $state('medium');
	let translationType = $state('balanced');
	let fidelity = $state('medium');
	let customRules = $state('');
	let systemPrompt = $state('');

	onMount(async () => {
		const data = await currentProjectStore.load(parseInt(projectId));
		if (data) {
			project = data.project;
			rules = data.rules;
			if (rules) {
				tone = rules.tone?.[0] || 'formal';
				vocabularyLevel = rules.vocabularyLevel || 'medium';
				translationType = rules.translationType || 'balanced';
				fidelity = rules.fidelity || 'medium';
				customRules = rules.customRules?.join('\n') || '';
				systemPrompt = rules.systemPrompt || '';
			}
		}
		presets = await rulesService.getPresets();
	});

	async function saveRules() {
		saving = true;
		await currentProjectStore.saveRules({
			name: rules?.name || 'قوانین پروژه',
			tone: [tone],
			vocabularyLevel,
			translationType,
			fidelity,
			customRules: customRules.split('\n').filter(r => r.trim()),
			systemPrompt
		});
		saving = false;
	}

	async function saveAsPreset() {
		const name = prompt('نام پیش‌تنظیم:');
		if (name) {
			await rulesService.savePreset({
				name,
				tone: [tone],
				vocabularyLevel,
				translationType,
				fidelity,
				customRules: customRules.split('\n').filter(r => r.trim()),
				systemPrompt
			});
			presets = await rulesService.getPresets();
		}
	}

	async function loadPreset(presetId) {
		const preset = presets.find(p => p.id === presetId);
		if (preset) {
			tone = preset.tone?.[0] || 'formal';
			vocabularyLevel = preset.vocabularyLevel || 'medium';
			translationType = preset.translationType || 'balanced';
			fidelity = preset.fidelity || 'medium';
			customRules = preset.customRules?.join('\n') || '';
			systemPrompt = preset.systemPrompt || '';
		}
	}

	async function exportRules() {
		const data = await rulesService.exportRules(parseInt(projectId));
		if (data) {
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `rules-${projectId}.json`;
			a.click();
			URL.revokeObjectURL(url);
		}
	}

	async function importRules(event) {
		const file = event.target.files?.[0];
		if (file) {
			const text = await file.text();
			const data = JSON.parse(text);
			await rulesService.importRules(parseInt(projectId), data);
			window.location.reload();
		}
	}
</script>

<div class="container mx-auto py-8 px-4 max-w-2xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold">قوانین ترجمه</h1>
		<p class="text-muted-foreground mt-1">
			تنظیم قوانین و سبک ترجمه برای پروژه
		</p>
	</div>

	{#if presets.length > 0}
		<Card class="mb-6">
			<CardHeader>
				<CardTitle>پیش‌تنظیم‌ها</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="flex flex-wrap gap-2">
					{#each presets as preset}
						<Button variant="outline" size="sm" onclick={() => loadPreset(preset.id)}>
							{preset.name}
						</Button>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}

	<Card class="mb-6">
		<CardHeader>
			<CardTitle>تنظیمات سبک</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label>لحن</Label>
					<Select bind:value={tone}>
						<SelectTrigger><SelectValue /></SelectTrigger>
						<SelectContent>
							<SelectItem value="formal">رسمی</SelectItem>
							<SelectItem value="informal">غیررسمی</SelectItem>
							<SelectItem value="literary">ادبی</SelectItem>
							<SelectItem value="scientific">علمی</SelectItem>
							<SelectItem value="conversational">محاوره‌ای</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div class="space-y-2">
					<Label>سطح واژگان</Label>
					<Select bind:value={vocabularyLevel}>
						<SelectTrigger><SelectValue /></SelectTrigger>
						<SelectContent>
							<SelectItem value="simple">ساده</SelectItem>
							<SelectItem value="medium">متوسط</SelectItem>
							<SelectItem value="advanced">پیشرفته</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div class="space-y-2">
					<Label>نوع ترجمه</Label>
					<Select bind:value={translationType}>
						<SelectTrigger><SelectValue /></SelectTrigger>
						<SelectContent>
							<SelectItem value="literal">تحت‌اللفظی</SelectItem>
							<SelectItem value="balanced">متعادل</SelectItem>
							<SelectItem value="free">آزاد</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div class="space-y-2">
					<Label>وفاداری به متن</Label>
					<Select bind:value={fidelity}>
						<SelectTrigger><SelectValue /></SelectTrigger>
						<SelectContent>
							<SelectItem value="low">کم</SelectItem>
							<SelectItem value="medium">متوسط</SelectItem>
							<SelectItem value="high">زیاد</SelectItem>
							<SelectItem value="literal">تحت‌اللفظی</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div class="space-y-2">
				<Label>قوانین سفارشی (هر خط یک قانون)</Label>
				<Textarea bind:value={customRules} rows={4} placeholder="مثال: اصطلاحات فنی را ترجمه نکن" />
			</div>

			<div class="space-y-2">
				<Label>پرامپت سیستم (اختیاری)</Label>
				<Textarea bind:value={systemPrompt} rows={4} placeholder="دستورالعمل‌های اضافی برای مدل..." />
			</div>
		</CardContent>
	</Card>

	<div class="flex flex-wrap gap-2">
		<Button variant="outline" href="/projects/{projectId}">بازگشت</Button>
		<Button variant="outline" onclick={exportRules}>خروجی JSON</Button>
		<label class="inline-flex">
			<Button variant="outline" as="span">ورودی JSON</Button>
			<input type="file" accept=".json" class="hidden" onchange={importRules} />
		</label>
		<Button variant="outline" onclick={saveAsPreset}>ذخیره به عنوان پیش‌تنظیم</Button>
		<Button onclick={saveRules} disabled={saving}>
			{saving ? 'در حال ذخیره...' : 'ذخیره قوانین'}
		</Button>
	</div>
</div>
