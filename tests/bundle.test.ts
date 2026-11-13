import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const bundle = JSON.parse(readFileSync('bundle/content.json', 'utf8'));
test('machine contract preserves every legacy guide verbatim with matching H1 and hash', () => {
  assert.equal(manifest.pages.length, 49);
  assert.equal(bundle.schemaVersion, 1);
  assert.equal(bundle.version, manifest.version);
  for (const page of manifest.pages) {
    const entry = bundle.pages.find((item: { path: string }) => item.path === page.path);
    assert.ok(entry, page.path);
    assert.equal(entry.title, page.title);
    assert.equal(entry.content, readFileSync(page.file, 'utf8'));
  }
  assert.equal(bundle.openapiSha256, createHash('sha256').update(readFileSync(manifest.openapi)).digest('hex'));
  assert.equal(new Set(bundle.pages.map((page: { path: string }) => page.path.toLowerCase())).size, bundle.pages.length);
});
test('all API operations and components are searchable in bounded individual pages', () => {
  const contract = JSON.parse(readFileSync(manifest.openapi, 'utf8'));
  for (const item of Object.values(contract.paths) as Record<string, { operationId: string }>[]) {
    for (const [method, operation] of Object.entries(item)) {
      if (!/^(get|post|put|patch|delete|head|options|trace)$/.test(method)) continue;
      assert.ok(bundle.pages.find((page: { path: string }) => page.path === `API/${operation.operationId}.md`));
    }
  }
  for (const page of bundle.pages.filter((page: { path: string }) => page.path.startsWith('API/'))) {
    assert.ok(Buffer.byteLength(page.content) < 26000, page.path);
  }
  assert.ok(bundle.pages.some((page: { path: string }) => page.path.startsWith('API/Schemas/')));
});
test('critical agent tool instructions survive migration', () => {
  const page = (path: string) => bundle.pages.find((page: { path: string }) => page.path === path)?.content;
  assert.match(page('Neoism Agent/JSON Render.md'), /json-render/);
  assert.match(page('Neoism Agent/Skills.md'), /SKILL\.md/);
  assert.match(page('Neoism Agent/Tool Composition.md'), /Unsupported syntax is rejected before tool effects/);
});
