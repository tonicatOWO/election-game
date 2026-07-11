import { svelte } from '@sveltejs/vite-plugin-svelte';
import UnoCSS from 'unocss/vite';
import { defineConfig } from 'vite';

const apiPrefix = process.env.VITE_API_PREFIX ?? '/api';
const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:3000';
const wsTarget = process.env.VITE_WS_TARGET ?? apiTarget.replace(/^http/, 'ws');
const wsPath = process.env.VITE_WS_PATH ?? '/ws';

export default defineConfig({
  plugins: [UnoCSS(), svelte()],
  server: {
    port: Number(process.env.VITE_PORT ?? 5173),
    host: process.env.VITE_HOST ?? '0.0.0.0',
    proxy: {
      [apiPrefix]: {
        target: apiTarget,
      },
      [wsPath]: {
        target: wsTarget,
        ws: true,
      },
    },
    allowedHosts: true,
  },
});
