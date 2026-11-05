import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Preserve installed dependency license/notice texts with the offline artifact.
// Includes build dependencies too; inclusion is not a claim all their code ships.
export function dependencyNotices(root) {
  const packages = [];
  function visit(modules) {
    if (!existsSync(modules)) return;
    for (const entry of readdirSync(modules, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const path = resolve(modules, entry.name);
      if (entry.name.startsWith('@')) { visit(path); continue; }
      const manifest = resolve(path, 'package.json');
      if (!existsSync(manifest)) continue;
      const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
      const notices = {};
      for (const file of readdirSync(path, { withFileTypes: true })) {
        if (file.isFile() && /^(licen[cs]e|copying|notice)(\.|$|-)/i.test(file.name)) notices[file.name] = readFileSync(resolve(path, file.name), 'utf8');
      }
      packages.push({ name: pkg.name, version: pkg.version, license: pkg.license, notices });
      visit(resolve(path, 'node_modules'));
    }
  }
  visit(resolve(root, 'node_modules'));
  return JSON.stringify({ scope: 'Installed documentation dependencies, including build tooling', packages: packages.sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`)) }, null, 2) + '\n';
}
