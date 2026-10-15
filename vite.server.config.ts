import { defineConfig } from 'vite';

/** Builds the Node server (server/index.ts) into build/server/index.js. */
export default defineConfig({
  build: {
    ssr: 'server/index.ts',
    outDir: 'build/server',
    target: 'node20',
    emptyOutDir: true,
    rollupOptions: {
      output: { entryFileNames: 'index.js', format: 'esm' },
    },
  },
  // Keep npm packages (pg, sharp, redis…) as runtime dependencies.
  ssr: { external: true },
});
