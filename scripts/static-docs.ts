import type { Plugin, ViteDevServer } from 'vite';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createGuideMetadata, parseBundledPaths } from '../src/guide-links';
import { canonicalInventory, guideDescription, guideRoute, guideTitle, REFERENCE_ROUTE, SITE_ORIGIN } from '../src/docs-routes';
import { renderHandbook } from '../src/docs-render';
import { renderReference } from '../src/docs-reference-render';

/** A Vite plugin, not a postbuild: direct `vite build` and dev deep routes share the inventory. */
export function staticDocsPlugin(): Plugin {
  const manifest = readFileSync(new URL('../manifest.json', import.meta.url), 'utf8');
  const sources = Object.fromEntries(parseBundledPaths(manifest).map(path => [path, readFileSync(new URL(`../content/${path}`, import.meta.url), 'utf8')]));
  const guides = createGuideMetadata(manifest, sources);
  const routes = canonicalInventory(guides);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.filter(route => route.startsWith('/api/docs/')).map(route => `<url><loc>${SITE_ORIGIN}${route}</loc></url>`).join('')}</urlset>\n`;
  const pages = new Map<string, string>();
  const template = readFileSync(new URL('../api/docs/index.html', import.meta.url), 'utf8');
  for (const route of routes.filter(route => route !== '/')) {
    const dom = new JSDOM(template, { url: SITE_ORIGIN + route });
    const document = dom.window.document;
    const guide = guides.find(guide => guideRoute(guide.path) === route);
    const title = guide ? guideTitle(guide) : 'Agent API reference — Neoism docs';
    const description = guide ? guideDescription(guide) : 'Neoism Agent HTTP API reference: local server authentication, endpoints, request parameters, responses, and schemas from the versioned OpenAPI contract.';
    document.title = title;
    const inventory = document.createElement('meta'); inventory.name = 'docs-guide-paths'; inventory.content = JSON.stringify(guides.map(guide => guide.path)); document.head.append(inventory);
    document.querySelector('meta[name="description"]')!.setAttribute('content', description);
    document.querySelector('link[rel="canonical"]')!.setAttribute('href', SITE_ORIGIN + route);
    for (const [attribute, name, content] of [
      ['property', 'og:type', 'website'],
      ['property', 'og:site_name', 'Neoism'],
      ['property', 'og:title', title],
      ['property', 'og:description', description],
      ['property', 'og:url', SITE_ORIGIN + route],
      ['property', 'og:image', `${SITE_ORIGIN}/neoism-intro.webp`],
      ['name', 'twitter:card', 'summary_large_image'],
      ['name', 'twitter:title', title],
      ['name', 'twitter:description', description],
      ['name', 'twitter:image', `${SITE_ORIGIN}/neoism-intro.webp`],
    ] as const) {
      const meta = document.createElement('meta'); meta.setAttribute(attribute, name); meta.content = content; document.head.append(meta);
    }
    const container = document.querySelector('#docs-content')!;
    container.setAttribute('aria-busy', 'false'); container.replaceChildren();
    if (guide) container.append(renderHandbook(document, guides, guide)); else container.innerHTML = renderReference();
    for (const [id, href] of [['guides-tab', '/api/docs/'], ['reference-tab', REFERENCE_ROUTE]]) {
      const anchor = document.getElementById(id!)!; anchor.setAttribute('href', href!);
      anchor.setAttribute('aria-current', (id === 'guides-tab') === Boolean(guide) ? 'page' : 'false');
    }
    pages.set(route, dom.serialize()); dom.window.close();
  }
   function canonicalAlias(url: string): string | null {
     const path = url.split('?')[0]!;
     const normalized = path.replace(/index\.html$/, '');
     const canonical = pages.has(normalized) ? normalized : pages.has(path + '/') ? path + '/' : null;
     return canonical && canonical !== path ? canonical + url.slice(path.length) : null;
   }
   function middleware(server: ViteDevServer) {
    server.middlewares.use(async (req, res, next) => {
      const path = (req.url || '').split('?')[0]!;
      if (path === '/sitemap.xml') { res.setHeader('Content-Type', 'application/xml'); res.end(sitemap); return; }
      const normalized = path.replace(/index\.html$/, '');
       const redirect = canonicalAlias(req.url || '');
       if (redirect) { res.statusCode = 308; res.setHeader('Location', redirect); res.end(); return; }
       const html = pages.get(normalized);
      if (!html) {
        if (path.startsWith('/api/docs/') && !path.endsWith('.ts') && !path.endsWith('.css')) {
          res.statusCode = 404; res.end('Guide not found'); return;
        }
        next(); return;
      }
      try { res.setHeader('Content-Type', 'text/html'); res.end(await server.transformIndexHtml(normalized, html)); } catch (error) { next(error); }
    });
  }
  return {
    name: 'static-docs',
    enforce: 'post',
     configureServer: middleware,
     configurePreviewServer(server) {
       // Match directory-index hosting instead of Vite's homepage SPA fallback.
       server.middlewares.use((req, res, next) => {
         const redirect = canonicalAlias(req.url || '');
         if (redirect) { res.statusCode = 308; res.setHeader('Location', redirect); res.end(); return; }
         const path = (req.url || '').split('?')[0]!;
         if (path.startsWith('/api/docs/') && !pages.has(path)) { res.statusCode = 404; res.end('Guide not found'); return; }
         next();
       });
     },
    transformIndexHtml: { order: 'pre', handler(html, context) { return context.path === '/api/docs/index.html' ? pages.get('/api/docs/')! : html; } },
    generateBundle(_options, bundle) {
      // Reuse Vite's transformed shell/assets for every document, not hand-maintained hashed paths.
      const shell = bundle['api/docs/index.html'];
      if (!shell || shell.type !== 'asset') throw new Error('Missing transformed docs entry');
      const built = new JSDOM(String(shell.source));
      const assetHead = [...built.window.document.head.querySelectorAll('script, link[rel="stylesheet"], link[rel="modulepreload"]')].map(element => element.outerHTML).join('\n');
      for (const [route, html] of pages) {
        const dom = new JSDOM(html); const document = dom.window.document;
        document.querySelectorAll('script, link[rel="stylesheet"], link[rel="modulepreload"]').forEach(element => element.remove());
        document.head.insertAdjacentHTML('beforeend', assetHead);
        const fileName = route.slice(1) + 'index.html';
        if (fileName === 'api/docs/index.html') shell.source = dom.serialize();
        else this.emitFile({ type: 'asset', fileName, source: dom.serialize() });
        dom.window.close();
      }
      built.window.close();
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
    },
  };
}