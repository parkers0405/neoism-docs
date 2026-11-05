// No npm dependencies: Rust consumers can validate/regenerate this bundle with Node alone.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function generateBundle() {
  const manifestBytes = readFileSync(resolve(root, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.schemaVersion !== 1 || !manifest.version || !manifest.pages.length) throw new Error('Invalid manifest');
  const sources = createHash('sha256').update(manifestBytes);
  const pages = manifest.pages.map(page => {
    if (page.file !== 'content/' + page.path || page.path.includes('..') || !page.path.endsWith('.md')) throw new Error('Unsafe guide path');
    const content = readFileSync(resolve(root, page.file), 'utf8');
    const title = /^# (.+)$/m.exec(content)?.[1];
    if (title !== page.title) throw new Error(`Title mismatch: ${page.path}`);
    sources.update(page.file).update('\0').update(content).update('\0');
    return { path: page.path, title, content };
  });
  const bytes = readFileSync(resolve(root, manifest.openapi));
  sources.update(manifest.openapi).update('\0').update(bytes);
  const api = JSON.parse(bytes);
  const ids = new Set();
  // Keep large component definitions searchable without making the docs tool read 570KB.
  function addReference(path, title, introduction, value) {
    const lines = JSON.stringify(value, null, 2).split('\n');
    const chunks = []; let chunk = '';
    for (const line of lines) {
      if (Buffer.byteLength(line) > 20000) throw new Error(`Unbounded API line: ${path}`);
      if (Buffer.byteLength(chunk + line) > 24000) { chunks.push(chunk); chunk = ''; }
      chunk += line + '\n';
    }
    if (chunk) chunks.push(chunk);
    chunks.forEach((text, index) => pages.push({
      path: index === 0 ? path : path.replace(/\.md$/, `.part-${index + 1}.md`),
      title: index === 0 ? title : `${title} (part ${index + 1})`,
      content: `# ${title}${index ? ` (part ${index + 1})` : ''}\n\n${introduction}\n\nContract: reference/openapi.json. References such as #/components/schemas/Name resolve to API/Schemas/Name.md.\n\n\`\`\`json\n${text}\`\`\`\n`,
    }));
  }
  for (const [path, item] of Object.entries(api.paths)) {
    for (const [method, operation] of Object.entries(item)) {
      if (!/^(get|put|post|patch|delete|head|options|trace)$/.test(method)) continue;
      const id = operation.operationId;
      if (!id || !/^[a-zA-Z0-9._-]+$/.test(id) || ids.has(id)) throw new Error(`Missing/duplicate/unsafe operationId: ${id}`);
      ids.add(id);
      addReference(`API/${id}.md`, `${method.toUpperCase()} ${path}`, `${operation.summary || id}\n\n${operation.description || ''}\n\nThis is a local agent server API, not a hosted service. Requests require the authentication configured by the server; operation security overrides the top-level security.`, {
        method: method.toUpperCase(), path, servers: operation.servers ?? item.servers ?? api.servers,
        security: operation.security ?? api.security ?? [],
        pathParameters: item.parameters ?? [], ...operation,
      });
    }
  }
  for (const [kind, entries] of Object.entries(api.components ?? {})) {
    const category = kind === 'schemas' ? 'Schemas' : kind;
    for (const [name, value] of Object.entries(entries)) {
      if (!/^[a-zA-Z0-9._-]+$/.test(name)) throw new Error(`Unsafe component: ${name}`);
      addReference(`API/${category}/${name}.md`, `${category}: ${name}`, `OpenAPI component #/components/${kind}/${name}`, value);
    }
  }
  if (new Set(pages.map(page => page.path.toLowerCase())).size !== pages.length) throw new Error('Duplicate page paths');
  return JSON.stringify({ schemaVersion: 1, version: manifest.version, pages, openapiSha256: sha256(bytes), sourcesSha256: sources.digest('hex') }, null, 2) + '\n';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const generated = generateBundle();
  const target = resolve(root, 'bundle/content.json');
  if (process.argv.includes('--check')) {
    if (readFileSync(target, 'utf8') !== generated) throw new Error('Stale bundle/content.json: run npm run bundle');
    console.log('Machine bundle is fresh');
  } else {
    mkdirSync(resolve(root, 'bundle'), { recursive: true });
    writeFileSync(target, generated);
    console.log(`Generated ${JSON.parse(generated).pages.length} searchable pages (${Buffer.byteLength(generated)} bytes)`);
  }
}
