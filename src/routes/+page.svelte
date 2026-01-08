<script>
	import { Button } from "$lib/components/ui-rtl/button";
	import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "$lib/components/ui-rtl/card";
	import { Badge } from "$lib/components/ui-rtl/badge";
	import LogInIcon from "@lucide/svelte/icons/log-in";
	import UserPlusIcon from "@lucide/svelte/icons/user-plus";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import LayoutDashboardIcon from "@lucide/svelte/icons/layout-dashboard";
	import PanelLeftIcon from "@lucide/svelte/icons/panel-left";
	import ComponentIcon from "@lucide/svelte/icons/component";
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	
	const categories = [
		{
			title: 'صفحات ورود',
			description: '5 نمونه صفحه ورود با طراحی‌های متنوع',
			icon: LogInIcon,
			href: '/login',
			count: 5,
			color: 'text-blue-500'
		},
		{
			title: 'صفحات ثبت‌نام',
			description: '5 نمونه صفحه ثبت‌نام با طراحی‌های مختلف',
			icon: UserPlusIcon,
			href: '/signup',
			count: 5,
			color: 'text-green-500'
		},
		{
			title: 'صفحات تایید کد',
			description: '5 نمونه صفحه تایید کد OTP',
			icon: ShieldCheckIcon,
			href: '/otp',
			count: 5,
			color: 'text-purple-500'
		},
		{
			title: 'منوهای کناری',
			description: '16 نمونه منوی کناری با طراحی‌های مختلف',
			icon: PanelLeftIcon,
			href: '/sidebar',
			count: 16,
			color: 'text-orange-500'
		},
		{
			title: 'داشبورد',
			description: 'داشبورد کامل با تمام امکانات',
			icon: LayoutDashboardIcon,
			href: '/dashboard',
			count: 1,
			color: 'text-pink-500'
		},
		{
			title: 'دمو کامپوننت‌ها',
			description: 'نمایش 54 کامپوننت RTL',
			icon: ComponentIcon,
			href: '/rtl-demo',
			count: 54,
			color: 'text-cyan-500'
		}
	];
</script>

<div class="min-h-screen bg-gradient-to-b from-background to-muted/20">
	<div class="container mx-auto px-6 py-16 space-y-16">
		<!-- Hero Section -->
		<div class="text-center space-y-6 max-w-3xl mx-auto">
			<Badge variant="outline" class="text-sm px-4 py-1">
				✨ نسخه 1.0
			</Badge>
			<h1 class="text-5xl md:text-6xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
				قالب مدیریتی فارسی
			</h1>
			<p class="text-xl text-muted-foreground">
				30+ صفحه آماده با پشتیبانی کامل RTL و 54 کامپوننت فارسی
			</p>
			
		</div>

		<!-- Categories Grid -->
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each categories as category}
				<a href={category.href} class="group">
					<Card class="h-full transition-all hover:shadow-lg hover:scale-[1.02]">
						<CardHeader>
							<div class="flex items-start justify-between">
								<div class="p-3 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
									<svelte:component this={category.icon} class="size-6 {category.color}" />
								</div>
								<Badge variant="secondary">{category.count}</Badge>
							</div>
							<CardTitle class="mt-4 group-hover:text-primary transition-colors">
								{category.title}
							</CardTitle>
							<CardDescription>
								{category.description}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button variant="ghost" class="w-full justify-between group-hover:bg-primary/5">
								مشاهده
								<ArrowLeftIcon class="size-4 transition-transform group-hover:-translate-x-1" />
							</Button>
						</CardContent>
					</Card>
				</a>
			{/each}
		</div>

		<!-- Footer -->
		<div class="text-center space-y-4 py-8 border-t">
			<div class="inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
				<span class="text-sm font-medium">📦 30+ صفحه</span>
				<span class="text-muted-foreground">•</span>
				<span class="text-sm font-medium">🎨 54 کامپوننت RTL</span>
				<span class="text-muted-foreground">•</span>
				<span class="text-sm font-medium">✨ فونت Vazirmatn</span>
			</div>
			<p class="text-sm text-muted-foreground">ساخته شده با ❤️ برای جامعه فارسی‌زبان</p>
		</div>
	</div>
</div>
