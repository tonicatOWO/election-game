import { svelte } from '@sveltejs/vite-plugin-svelte';
import UnoCSS from 'unocss/vite';
import { defineConfig } from 'vite';

const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:3000';
const wsTarget = apiTarget.replace(/^http/, 'ws');

export default defineConfig({
  plugins: [UnoCSS(), svelte()],
  server: {
    port: 5173,
    proxy: {
      '/api': apiTarget,
      '/ws': {
        target: wsTarget,
        ws: true,
      },
    },
  },
});
