<script>
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import RtlProvider from '$lib/components/rtl-provider.svelte';
	
	export const prerender = true;
	
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>قالب مدیریتی فارسی - shadcn-svelte RTL</title>
	<meta name="description" content="قالب مدیریتی کامل با پشتیبانی RTL و فونت فارسی" />
</svelte:head>

<RtlProvider rtl={true} lang="fa">
	{@render children?.()}
</RtlProvider>
