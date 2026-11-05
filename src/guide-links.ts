export const GUIDE_CATEGORIES = ['Getting Started', 'Neoism', 'Neoism Agent', 'Neoism Daemon'] as const;
export type GuideCategory = typeof GUIDE_CATEGORIES[number] | 'Start Here';
export interface GuideMetadata {
  path: string;
  title: string;
  category: GuideCategory;
  body: string;
  order: number;
}

/** Only the canonical macro invocation, never strings in Rust tests or helpers. */
export function parseBundledPaths(manifest: string): string[] {
  if (manifest.trim().startsWith('{')) {
    return JSON.parse(manifest).pages.map((page: { path: string }) => page.path);
  }
  const inventory = /\bpub\s+static\s+BUNDLED_DOCS\s*:[\s\S]*?=\s*docs!\s*\[([\s\S]*?)\]\s*;/.exec(manifest)?.[1];
  if (!inventory) throw new Error('Canonical BUNDLED_DOCS inventory not found');
  return [...inventory.matchAll(/"([^"\r\n]+\.md)"/g)].map(match => match[1]!);
}

export function createGuideMetadata(manifest: string, sources: Record<string, string>): GuideMetadata[] {
  return parseBundledPaths(manifest).map((path, order) => {
    const body = sources[path];
    if (body === undefined) throw new Error(`Missing bundled guide: ${path}`);
    const category = path.includes('/') ? path.split('/')[0] : 'Start Here';
    if (category !== 'Start Here' && !GUIDE_CATEGORIES.some(item => item === category)) {
      throw new Error(`Unknown guide category: ${category}`);
    }
    return { path, body, order, category: category as GuideCategory,
      title: /^#\s+(.+?)\s*#*\s*$/m.exec(body)?.[1]?.trim() || path.replace(/\.md$/, '') };
  });
}

export function headingSlug(title: string): string {
  return title.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s+/g, '-');
}

export function guideHash(path: string, heading?: string): string {
  return `#guide/${encodeURIComponent(path.replace(/\.md$/i, ''))}${heading ? `?heading=${encodeURIComponent(heading)}` : ''}`;
}

export function parseGuideHash(hash: string): { path: string; heading?: string } | null {
  if (!hash || hash === '#guides' || hash === '#main') return { path: 'Start Here.md' };
  if (!hash.startsWith('#guide/')) return null;
  const [encoded, query = ''] = hash.slice(7).split('?');
  try {
    const path = decodeURIComponent(encoded || '').replace(/\.md$/i, '') + '.md';
    const heading = new URLSearchParams(query).get('heading') || undefined;
    return { path, heading };
  } catch { return { path: '' }; }
}

function normalizePath(path: string): string | null {
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (!parts.length) return null;
      parts.pop();
    } else parts.push(part);
  }
  return parts.join('/').replace(/\.md$/i, '');
}

/** Sibling first, then bundle-root path, then an unambiguous short name/title. */
export function resolveGuideLink(target: string, currentPath: string, guides: readonly GuideMetadata[]): string | null {
  let decoded: string;
  try { decoded = decodeURIComponent(target.trim()); } catch { return null; }
  if (/^[a-z][a-z\d+.-]*:/i.test(decoded) || decoded.startsWith('//') || decoded.startsWith('@')) return null;
  const split = decoded.indexOf('#');
  const note = (split < 0 ? decoded : decoded.slice(0, split)).trim();
  const heading = split < 0 ? undefined : decoded.slice(split + 1).trim();
  const directory = currentPath.slice(0, currentPath.lastIndexOf('/') + 1);
  const candidates = note ? [normalizePath(directory + note), normalizePath(note)] : [normalizePath(currentPath)];
  for (const candidate of candidates) {
    if (candidate === null) continue;
    const guide = guides.find(item => item.path.replace(/\.md$/i, '').toLowerCase() === candidate.toLowerCase());
    if (guide) return guideHash(guide.path, heading);
  }
  // Never guess between e.g. Agent/Troubleshooting and Daemon/Troubleshooting.
  if (!note.includes('/')) {
    const name = note.replace(/\.md$/i, '').toLowerCase();
    const matches = guides.filter(item => item.title.toLowerCase() === name || item.path.split('/').pop()!.replace(/\.md$/i, '').toLowerCase() === name);
    if (matches.length === 1) return guideHash(matches[0]!.path, heading);
  }
  return null;
}

export function splitWikiLink(value: string): { target: string; label: string } {
  const separator = value.indexOf('|');
  const target = (separator < 0 ? value : value.slice(0, separator)).trim();
  return { target, label: (separator < 0 ? target : value.slice(separator + 1)).trim() };
}