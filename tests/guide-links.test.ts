import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createGuideMetadata, GUIDE_CATEGORIES, guideHash, headingSlug, parseBundledPaths, parseGuideHash, resolveGuideLink, splitWikiLink } from '../src/guide-links.ts';

const manifest = readFileSync(new URL('../manifest.json', import.meta.url), 'utf8');
const paths = parseBundledPaths(manifest);
const sources = Object.fromEntries(paths.map(path => [path, readFileSync(new URL(`../content/${path}`, import.meta.url), 'utf8')]));
const guides = createGuideMetadata(manifest, sources);

test('inventory reads only BUNDLED_DOCS and preserves canonical order', () => {
  const fixture = 'const OTHER: &str = "outside.md"; pub static BUNDLED_DOCS: &[BundledDoc] = docs!["Start Here.md", "Neoism/Editor.md",]; #[test] fn test() { let s = "test.md"; }';
  assert.deepEqual(parseBundledPaths(fixture), ['Start Here.md', 'Neoism/Editor.md']);
  assert.equal(paths[0], 'Start Here.md');
  assert.equal(paths.at(-1), 'Neoism Daemon/Troubleshooting.md');
  assert.ok(paths.includes('Neoism Agent/Tool Composition.md'));
  assert.equal(paths.filter(path => path === 'Neoism Agent/Tool Composition.md').length, 1);
  assert.ok(!paths.includes('Neoism Agent/Plugin Authoring.md'), 'unlisted welcome copies must not leak into the handbook');
  assert.throws(() => parseBundledPaths('docs!["not-the-inventory.md"]'), /inventory not found/);
});

test('metadata exposes actual H1 titles, source bodies, categories and order', () => {
  assert.equal(guides[0]?.title, 'Welcome to Neoism');
  assert.equal(guides[0]?.category, 'Start Here');
  assert.deepEqual([...new Set(guides.slice(1).map(guide => guide.category))], [...GUIDE_CATEGORIES]);
  for (const [order, guide] of guides.entries()) {
    assert.equal(guide.order, order);
    assert.equal(guide.body, sources[guide.path]);
    assert.equal(guide.title, /^# (.+)$/m.exec(guide.body)?.[1]);
  }
  assert.throws(() => createGuideMetadata(manifest, {}), /Missing bundled guide/);
});

test('wiki aliases and scoped sibling names resolve without ambiguous basename guesses', () => {
  assert.deepEqual(splitWikiLink('Getting Started/01 Meet Neoism|Meet Neoism'), { target: 'Getting Started/01 Meet Neoism', label: 'Meet Neoism' });
  assert.equal(resolveGuideLink('Tool Composition', 'Neoism Agent/The Neoism Agent.md', guides), guideHash('Neoism Agent/Tool Composition.md'));
  assert.equal(resolveGuideLink('Troubleshooting', 'Neoism Agent/Providers.md', guides), guideHash('Neoism Agent/Troubleshooting.md'));
  assert.equal(resolveGuideLink('Troubleshooting', 'Neoism Daemon/The Neoism Daemon.md', guides), guideHash('Neoism Daemon/Troubleshooting.md'));
  assert.equal(resolveGuideLink('Troubleshooting', 'Start Here.md', guides), null);
  assert.equal(resolveGuideLink('Neoism Daemon/Multiplayer and Sync', 'Neoism/Editor.md', guides), guideHash('Neoism Daemon/Multiplayer and Sync.md'));
  assert.equal(resolveGuideLink('Tool Composition', 'Start Here.md', guides), guideHash('Neoism Agent/Tool Composition.md'));
  assert.equal(resolveGuideLink('Plugin Authoring', 'Neoism Agent/Plugins.md', guides), null);
  assert.equal(resolveGuideLink('@project/Page', 'Start Here.md', guides), null);
});

test('Markdown relative links resolve sibling, parent and percent-encoded filenames', () => {
  assert.equal(resolveGuideLink('./Tool%20Composition.md', 'Neoism Agent/Tools and Background Tasks.md', guides), guideHash('Neoism Agent/Tool Composition.md'));
  assert.equal(resolveGuideLink('../Neoism/Editor.md', 'Neoism Agent/Configure.md', guides), guideHash('Neoism/Editor.md'));
  assert.equal(resolveGuideLink('../Start Here.md', 'Neoism/Editor.md', guides), guideHash('Start Here.md'));
  assert.equal(resolveGuideLink('../../outside.md', 'Neoism/Editor.md', guides), null);
  assert.equal(resolveGuideLink('missing.md', 'Neoism/Editor.md', guides), null);
});

test('heading links preserve the guide route instead of colliding with API hashes', () => {
  const href = resolveGuideLink('Neoism/Appearance#Follow Omarchy', 'Getting Started/06 Configure Neoism.md', guides);
  assert.equal(href, guideHash('Neoism/Appearance.md', 'Follow Omarchy'));
  assert.deepEqual(parseGuideHash(href!), { path: 'Neoism/Appearance.md', heading: 'Follow Omarchy' });
  assert.equal(resolveGuideLink('#Backgrounds', 'Neoism/Appearance.md', guides), guideHash('Neoism/Appearance.md', 'Backgrounds'));
  assert.equal(headingSlug('Follow Omarchy: theme & colors'), 'follow-omarchy-theme-colors');
  assert.deepEqual(parseGuideHash(''), { path: 'Start Here.md' });
  assert.deepEqual(parseGuideHash('#guides'), { path: 'Start Here.md' });
  assert.equal(parseGuideHash('#reference'), null);
  assert.equal(parseGuideHash('#reference/GET/v2/session'), null);
  assert.deepEqual(parseGuideHash('#guide/%E0%A4%A'), { path: '' });
});

test('unsafe schemes and remote URLs never become handbook hashes', () => {
  for (const value of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,test', 'https://example.com/Editor.md', '//evil.test/Editor.md', '%6aavascript:alert(1)']) {
    assert.equal(resolveGuideLink(value, 'Neoism/Editor.md', guides), null, value);
  }
  for (const guide of guides) {
    assert.deepEqual(parseGuideHash(guideHash(guide.path)), { path: guide.path, heading: undefined });
  }
});