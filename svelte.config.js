import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ 
			strict: false,
			fallback: 'index.html'
		}),
		paths: {
			base: ''
		},
		prerender: {
			crawl: true,
			entries: ['/'],
			handleHttpError: 'warn',
			handleMissingId: 'warn'
		}
	}
};

export default config;
