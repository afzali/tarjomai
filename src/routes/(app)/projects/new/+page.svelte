<script>
	import { goto } from '$app/navigation';
	import { projectsStore } from '$lib/stores/projects.store.js';
	import { settingsStore } from '$lib/stores/settings.store.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Input } from '$lib/components/ui-rtl/input';
	import { Label } from '$lib/components/ui-rtl/label';
	import { Textarea } from '$lib/components/ui-rtl/textarea';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui-rtl/card';
	import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui-rtl/select';

	let title = $state('');
	let description = $state('');
	let sourceLanguage = $state('en');
	let targetLanguage = $state('fa');
	let setupType = $state('guided');
	let creating = $state(false);

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
					<Select bind:value={sourceLanguage}>
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
					<Select bind:value={targetLanguage}>
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
