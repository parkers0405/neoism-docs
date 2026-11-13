import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createGuideMetadata, parseBundledPaths } from '../src/guide-links.ts';
import { canonicalInventory, guideDescription, guideRoute, guideTitle, legacyGuideHref } from '../src/docs-routes.ts';
import { renderHandbook } from '../src/docs-render.ts';
import { renderReference } from '../src/docs-reference-render.ts';
const manifest = readFileSync('manifest.json', 'utf8');
const guides = createGuideMetadata(manifest, Object.fromEntries(parseBundledPaths(manifest).map(path => [path, readFileSync(`content/${path}`, 'utf8')])));

test('canonical inventory includes all handbook and hosting routes with unique metadata', () => {
  assert.equal(guides.length, 49); assert.equal(canonicalInventory(guides).length, guides.length + 2);
  assert.equal(new Set(guides.map(guideTitle)).size, guides.length);
  assert.equal(new Set(guides.map(guideDescription)).size, guides.length);
  for (const guide of guides) assert.doesNotMatch(guideDescription(guide), /Website clarification/);
  assert.match(guideDescription({ path: 'Example.md', title: 'Example', category: 'Start Here', order: 0, body: '# Example\n\nRead [[Neoism Agent/SDK|the SDK]] to start.' }), /Read the SDK to start\./);
  assert.equal(guideRoute('Start Here.md'), '/api/docs/');
  assert.equal(guideRoute('Neoism Agent/Troubleshooting.md'), '/api/docs/guides/neoism-agent/troubleshooting/');
  assert.equal(legacyGuideHref('#guide/Neoism%20Agent%2FSDK?heading=Quick%20start'), '/api/docs/guides/neoism-agent/sdk/#guide-heading-quick-start');
});
test('explicit DOM renderer produces complete safe articles and canonical links for every guide', () => {
  const dom = new JSDOM('', { url: 'https://neoism.ai' });
  for (const guide of guides) {
    const element = renderHandbook(dom.window.document, guides, guide);
    assert.ok(element.querySelector('.guide-prose h1'));
    assert.equal(element.querySelectorAll('.guide-nav-link').length, guides.length);
    assert.ok((element.querySelector('.guide-prose')?.textContent?.length || 0) > 300);
    assert.equal(element.querySelectorAll('script, img, iframe').length, 0);
    assert.equal(element.querySelectorAll('a[href^="#guide/"]').length, 0);
    for (const anchor of element.querySelectorAll('.guide-toc-link')) {
      assert.ok(anchor.getAttribute('href')?.startsWith('/api/docs/'), anchor.outerHTML);
    }
    for (const anchor of element.querySelectorAll<HTMLAnchorElement>('a[href^="/api/docs/"]')) {
      assert.ok(canonicalInventory(guides).includes(anchor.pathname), anchor.href);
      if (anchor.hash && anchor.pathname === guideRoute(guide.path)) assert.ok(element.querySelector(anchor.hash), anchor.hash);
    }
  }
  dom.window.close();
});
test('reference fallback contains all OpenAPI methods, schemas and safe local-server guidance', () => {
  const html = renderReference();
  assert.ok(html.length > 100000);
  assert.match(html, /Authorization: Bearer/); assert.match(html, /not a hosted agent service/);
  assert.match(html, /Request body/); assert.match(html, /Responses/); assert.match(html, /securitySchemes/);
  assert.doesNotMatch(html, /<script|<iframe/);
});