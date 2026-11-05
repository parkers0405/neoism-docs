import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

test('packaged handbook, search, legacy links and Scalar work without external requests', async ({ page }) => {
  const external: string[] = [];
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.addInitScript(() => {
    (window as unknown as { cspViolations: string[] }).cspViolations = [];
    document.addEventListener('securitypolicyviolation', event => {
      (window as unknown as { cspViolations: string[] }).cspViolations.push(`${event.effectiveDirective}: ${event.blockedURI}`);
    });
  });
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname !== '127.0.0.1') { external.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  await page.goto('/api/docs/');
  await expect(page.locator('.guide-prose h1')).toContainText('Welcome to Neoism');
  await page.locator('.guide-search').fill('SKILL.md');
  await expect(page.locator('.guide-search-count')).toContainText('guide');
  await page.goto('/api/docs/#guide/Neoism%20Agent%2FJSON%20Render');
  await expect(page).toHaveURL(/guides\/neoism-agent\/json-render\//);
  await expect(page.locator('.guide-prose h1')).toContainText('Native json-render chat UI');
  await page.goto('/api/docs/#reference');
  await expect(page).toHaveURL(/reference\/#reference/);
  await expect(page.locator('.scalar-scope[data-ready="true"]')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.reference-fallback')).toBeHidden();
  await page.waitForTimeout(1000);
  expect(external).toEqual([]);
  expect(failures).toEqual([]);
  expect(await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations)).toEqual([]);
});
test('static pages, reference, artifact hashes and machine content survive without JS', async ({ browser, request }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:43181/api/docs/guides/neoism/terminal/');
  await expect(page.locator('.guide-prose')).toContainText('Block terminal is enabled by default');
  await page.goto('http://127.0.0.1:43181/api/docs/reference/');
  await expect(page.locator('.reference-fallback')).toContainText('Authorization: Bearer');
  const content = await request.get('/content.json');
  expect(await content.body()).toEqual(readFileSync('bundle/content.json'));
  const artifact = await (await request.get('/artifact.json')).json();
  for (const [path, entry] of Object.entries(artifact.files) as [string, { sha256: string }][]) {
    const response = await request.get('/' + path);
    expect(response.status(), path).toBe(200);
    expect(createHash('sha256').update(await response.body()).digest('hex'), path).toBe(entry.sha256);
  }
  expect((await request.get('/api/docs/guides/not-real/')).status()).toBe(404);
  await context.close();
});
