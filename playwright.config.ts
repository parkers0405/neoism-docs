import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: 'http://127.0.0.1:43181', headless: true },
  webServer: { command: 'node scripts/serve.mjs', url: 'http://127.0.0.1:43181/api/docs/', reuseExistingServer: false },
});
