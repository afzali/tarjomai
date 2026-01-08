<script>
	import { Button } from "$lib/components/ui-rtl/button";
	import { ToggleGroup, ToggleGroupItem } from "$lib/components/ui-rtl/toggle-group";
	import { Separator } from "$lib/components/ui-rtl/separator";
	import MonitorIcon from "@lucide/svelte/icons/monitor";
	import TabletIcon from "@lucide/svelte/icons/tablet";
	import SmartphoneIcon from "@lucide/svelte/icons/smartphone";
	import FullscreenIcon from "@lucide/svelte/icons/fullscreen";
	import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
	import HomeIcon from "@lucide/svelte/icons/home";
	
	let iframeWidths = $state({});
	
	function setIframeWidth(itemId, width) {
		iframeWidths[itemId] = width;
	}
	
	function refreshIframe(itemId) {
		const iframe = document.getElementById(`iframe-${itemId}`);
		if (iframe) {
			iframe.src = iframe.src;
		}
	}
	
	const items = Array.from({ length: 16 }, (_, i) => ({
		id: `sidebar-${String(i + 1).padStart(2, '0')}`,
		title: `نمونه ${i + 1}`,
		desc: `Sidebar ${i + 1}`
	}));
</script>

<div class="min-h-screen bg-background">
	<div class="container mx-auto p-6 space-y-8">
		<div class="flex items-center justify-between border-b pb-4">
			<div>
				<h1 class="text-3xl font-bold">منوهای کناری</h1>
				<p class="text-muted-foreground mt-1">16 نمونه منوی کناری با طراحی‌های مختلف</p>
			</div>
			<Button href="/" variant="outline">
				<HomeIcon class="size-4 ml-2" />
				بازگشت به صفحه اصلی
			</Button>
		</div>

		<div class="space-y-8">
			{#each items as item, index}
				<div class="space-y-4">
					<div class="flex items-start justify-between border-b pb-4">
						<div class="space-y-1">
							<h3 class="text-xl font-semibold">{item.title} - {item.desc}</h3>
							<p class="text-sm text-muted-foreground">
								📁 فایل: <code class="bg-muted px-2 py-0.5 rounded">src/routes/{item.id}/+page.svelte</code>
							</p>
							<p class="text-sm text-muted-foreground">
								🔗 آدرس: <code class="bg-muted px-2 py-0.5 rounded">/{item.id}</code>
							</p>
						</div>
						
						<div class="flex items-center gap-2">
							<ToggleGroup type="single" value={iframeWidths[item.id] || '100'} onValueChange={(v) => setIframeWidth(item.id, v)} class="gap-1">
								<ToggleGroupItem value="100" title="Desktop" class="size-8 p-0">
									<MonitorIcon class="size-4" />
								</ToggleGroupItem>
								<ToggleGroupItem value="60" title="Tablet" class="size-8 p-0">
									<TabletIcon class="size-4" />
								</ToggleGroupItem>
								<ToggleGroupItem value="30" title="Mobile" class="size-8 p-0">
									<SmartphoneIcon class="size-4" />
								</ToggleGroupItem>
							</ToggleGroup>
							
							<Separator orientation="vertical" class="h-6" />
							
							<Button href="/{item.id}" target="_blank" variant="ghost" size="icon" class="size-8" title="باز کردن در تب جدید">
								<FullscreenIcon class="size-4" />
							</Button>
							
							<Separator orientation="vertical" class="h-6" />
							
							<Button onclick={() => refreshIframe(item.id)} variant="ghost" size="icon" class="size-8" title="بارگذاری مجدد">
								<RotateCcwIcon class="size-4" />
							</Button>
						</div>
					</div>
					
					<div class="border rounded-lg overflow-hidden bg-muted/50 shadow-sm mx-auto transition-all duration-300" style="width: {iframeWidths[item.id] || '100'}%">
						<iframe
							id="iframe-{item.id}"
							src="/{item.id}"
							title="{item.title}"
							class="w-full h-[600px] bg-background"
							loading="lazy"
						></iframe>
					</div>
				</div>
				
				{#if index < items.length - 1}
					<div class="border-t my-8"></div>
				{/if}
			{/each}
		</div>
	</div>
</div>
