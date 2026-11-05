import { headingSlug, parseGuideHash } from './guide-links.ts';
import type { GuideMetadata } from './guide-links.ts';

export const DOCS_ROOT = '/api/docs/';
export const REFERENCE_ROUTE = `${DOCS_ROOT}reference/`;
export const SITE_ORIGIN = 'https://neoism.ai';
export function guideRoute(path: string, heading?: string): string {
  const route = path === 'Start Here.md' ? DOCS_ROOT : `${DOCS_ROOT}guides/${path.replace(/\.md$/i, '').split('/').map(headingSlug).join('/')}/`;
  return route + (heading ? `#guide-heading-${headingSlug(heading)}` : '');
}
export function legacyGuideHref(hash: string): string | null {
  const route = parseGuideHash(hash);
  return route ? guideRoute(route.path, route.heading) : null;
}
export function guideTitle(guide: GuideMetadata): string {
  return `${guide.title}${guide.title === 'Troubleshooting' ? ` · ${guide.category}` : ''} — Neoism docs`;
}
export function guideDescription(guide: GuideMetadata): string {
  const prose = guide.body.split('\n').filter(line => line.trim() && !/^\s*(#|\||```|[-*] |>[ \t]*Website clarification:)/.test(line)).join(' ')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target: string, label?: string) => label || target).replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*`_]/g, '').replace(/\s+/g, ' ').trim();
  return `${guide.title} (${guide.category}): ${prose}`.slice(0, 180);
}
export function canonicalInventory(guides: readonly GuideMetadata[]): string[] {
  const routes = ['/', ...guides.map(guide => guideRoute(guide.path)), REFERENCE_ROUTE];
  if (new Set(routes).size !== routes.length) throw new Error('Duplicate canonical docs route');
  return routes;
}