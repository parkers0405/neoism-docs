import { copyFileSync, cpSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { generateBundle, root, sha256 } from './content-bundle.mjs';
import { dependencyNotices } from './licenses.mjs';

const bundle = readFileSync(resolve(root, 'bundle/content.json'), 'utf8');
if (bundle !== generateBundle()) throw new Error('Machine bundle is stale');
const dist = resolve(root, 'dist');
copyFileSync(resolve(root, 'bundle/content.json'), resolve(dist, 'content.json'));
copyFileSync(resolve(root, 'manifest.json'), resolve(dist, 'manifest.json'));
cpSync(resolve(root, 'reference'), resolve(dist, 'reference'), { recursive: true });
cpSync(resolve(root, 'legal'), resolve(dist, 'legal'), { recursive: true });
writeFileSync(resolve(dist, 'legal/npm-licenses.json'), dependencyNotices(root));
copyFileSync(resolve(root, 'LICENSE'), resolve(dist, 'LICENSE'));
copyFileSync(resolve(root, 'NOTICE'), resolve(dist, 'NOTICE'));
writeFileSync(resolve(dist, 'index.html'), '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/api/docs/"><title>Neoism documentation</title><a href="/api/docs/">Open Neoism documentation</a>\n');
const files = {};
function inventory(dir) {
  for (const name of readdirSync(dir).sort()) {
    const path = resolve(dir, name);
    if (statSync(path).isDirectory()) inventory(path);
    else { const bytes = readFileSync(path); files[relative(dist, path).split(sep).join('/')] = { bytes: bytes.length, sha256: sha256(bytes) }; }
  }
}
inventory(dist);
writeFileSync(resolve(dist, 'artifact.json'), JSON.stringify({ schemaVersion: 1, version: JSON.parse(bundle).version, files }, null, 2) + '\n');
console.log(`Self-contained docs: ${Object.keys(files).length} files, ${Object.values(files).reduce((n, f) => n + f.bytes, 0)} bytes`);
