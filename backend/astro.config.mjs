import node from '@astrojs/node';
import { defineConfig } from 'astro/config';
import studioCMS from 'studiocms';

// https://astro.build/config
export default defineConfig({
	site: process.env.SITE_URL || (process.env.NODE_ENV === 'production' ? 'https://change.me' : 'http://localhost:4321'),
	output: 'server',
	// 'middleware' lets server.mjs serve the API, the CMS dashboard AND the React site from one Node process.
	adapter: node({ mode: 'middleware' }),
	security: {
		checkOrigin: false, // This depends on your hosting provider
	},
	integrations: [studioCMS()],
	// StudioCMS dashboard CSS trips lightningcss's minifier in production builds; esbuild handles it.
	vite: { build: { cssMinify: 'esbuild' } },
});
