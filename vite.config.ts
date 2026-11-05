import { defineConfig } from 'vite';
import { staticDocsPlugin } from './scripts/static-docs';
export default defineConfig({
  plugins: [staticDocsPlugin()],
  server: { cors: false },
  build: {
    assetsDir: 'docs-assets',
    rollupOptions: { input: 'api/docs/index.html' },
  },
});
