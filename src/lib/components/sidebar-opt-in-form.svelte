<script>
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
</script>

<Card.Root class="gap-2 py-4 shadow-none">
	<Card.Header class="px-4 text-right">
		<Card.Title class="text-sm">عضویت در خبرنامه</Card.Title>
		<Card.Description>برای دریافت به‌روزرسانی‌ها و اخبار مربوط به سایدبار عضو شوید.</Card.Description>
	</Card.Header>
	<Card.Content class="px-4">
		<form>
			<div class="grid gap-2.5">
				<Sidebar.Input type="email" placeholder="ایمیل" />
				<Button
					class="bg-sidebar-primary text-sidebar-primary-foreground w-full shadow-none"
					size="sm"
				>
					عضویت
				</Button>
			</div>
		</form>
	</Card.Content>
</Card.Root>