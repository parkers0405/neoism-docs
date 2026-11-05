import { DOCS_ROOT, guideRoute, REFERENCE_ROUTE } from './docs-routes';
import { parseGuideHash } from './guide-links';
const container = document.querySelector<HTMLElement>('#docs-content')!;
// Static hosts may serve directory indexes with or without a trailing slash.
const pathname = location.pathname.replace(/\/index\.html$/, '/').replace(/\/?$/, '/');
let revision = 0;
let destroy: (() => void) | undefined;
let active = false;
let invalidLegacyGuide = false;
function legacyRedirect(): boolean {
  const hash = location.hash;
  if (hash.startsWith('#guide/') || hash === '#guides') {
    const route = parseGuideHash(hash)!;
    const paths = JSON.parse(document.querySelector<HTMLMetaElement>('meta[name="docs-guide-paths"]')?.content || '[]') as string[];
    if (!paths.includes(route.path)) {
      invalidLegacyGuide = true;
      container.innerHTML = '<article class="guide-prose guide-main"><h1 tabindex="-1">Guide not found</h1><p>This page is not part of the bundled Neoism handbook.</p><a href="/api/docs/">Return to Start Here</a></article>';
      document.title = 'Guide not found — Neoism docs';
      container.querySelector<HTMLElement>('h1')?.focus(); return true;
    }
    location.replace(guideRoute(route.path, route.heading)); return true;
  }
  // Restore the canonical document after Back leaves a same-document error route.
  if (invalidLegacyGuide) { location.reload(); return true; }
  // Only the old entry URL used arbitrary Scalar hashes; guide fragments stay on guides.
  if (pathname === DOCS_ROOT && hash && hash !== '#main' && !hash.startsWith('#guide-heading-')) {
    location.replace(REFERENCE_ROUTE + hash); return true;
  }
  return false;
}
function focusHash() {
  if (!location.hash || legacyRedirect()) return;
  let id: string; try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'start', behavior: 'auto' });
}
async function enhance() {
  if (legacyRedirect() || active) return;
  active = true; const current = ++revision;
  try {
    if (pathname === REFERENCE_ROUTE) {
      const { mountReference } = await import('./scalar-reference');
      if (revision !== current) return;
      const cleanup = mountReference(container, () => {
        if (revision === current) container.querySelector<HTMLElement>('.reference-fallback')?.setAttribute('hidden', '');
      });
      if (revision !== current) cleanup(); else destroy = cleanup;
    } else {
      const { mountGuides } = await import('./docs-guides');
      if (revision !== current) return;
      destroy = mountGuides(container).destroy;
    }
  } catch (error) {
    if (revision !== current) return;
    active = false;
    container.querySelector('.scalar-scope')?.remove();
    const status = document.createElement('p'); status.className = 'docs-loading'; status.setAttribute('role', 'status');
    status.textContent = 'Interactive documentation could not load. The complete static documentation remains available. ';
    const retry = document.createElement('button'); retry.textContent = 'Retry'; retry.onclick = () => location.reload(); status.append(retry); container.append(status);
    console.error(error);
  }
}
window.addEventListener('hashchange', () => { if (!legacyRedirect()) focusHash(); });
document.querySelector<HTMLAnchorElement>('.skip-link')?.addEventListener('click', event => {
  event.preventDefault(); const main = document.getElementById('main'); main?.focus({ preventScroll: true }); main?.scrollIntoView({ block: 'start' });
});
document.addEventListener('click', event => {
  const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a') : null;
  if (link && link.origin === location.origin && link.pathname === location.pathname && link.hash === location.hash) focusHash();
});
window.addEventListener('pagehide', () => {
  ++revision; destroy?.(); destroy = undefined; active = false;
  container.querySelector<HTMLElement>('.reference-fallback')?.removeAttribute('hidden');
});
window.addEventListener('pageshow', () => { if (!active) void enhance(); });
focusHash(); void enhance();