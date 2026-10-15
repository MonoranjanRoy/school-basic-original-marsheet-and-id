import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API = `http://127.0.0.1:${process.env.API_PORT || 3100}`;

/** Frontend build (browser bundle + server-rendering bundle). */
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_YEAR__: JSON.stringify(new Date().getFullYear()),
  },
  build: {
    target: 'es2019',
    cssCodeSplit: false,
  },
  server: {
    // In development the API runs separately (see scripts/dev.mjs).
    // changeOrigin stays false so the API sees the browser's Host (needed by its same-origin check).
    proxy: {
      '/api': { target: API, changeOrigin: false },
      '/media': { target: API, changeOrigin: false },
    },
  },
  ssr: {
    // Bundle React into the server-rendering bundle so it runs in plain Node.
    noExternal: true,
  },
});
