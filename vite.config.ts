import { defineConfig } from 'vite';
import { staticDocsPlugin } from './scripts/static-docs';
export default defineConfig({
  plugins: [staticDocsPlugin()],
  server: { cors: false },
  build: {
    target: 'es2022',
    assetsDir: 'docs-assets',
    rollupOptions: { input: 'api/docs/index.html' },
  },
});
