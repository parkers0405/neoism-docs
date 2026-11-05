import { Marked } from 'marked';
import createDOMPurify from 'dompurify';
import { GUIDE_CATEGORIES, headingSlug, resolveGuideLink, splitWikiLink } from './guide-links.ts';
import type { GuideMetadata } from './guide-links.ts';
import { guideRoute, legacyGuideHref } from './docs-routes.ts';

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
/** Explicit document injection: the browser and build use identical sanitization and rendering. */
export function renderHandbook(document: Document, guides: readonly GuideMetadata[], guide: GuideMetadata): HTMLElement {
  function node(tag: string, className = '', text = ''): HTMLElement {
    const element = document.createElement(tag); element.className = className; element.textContent = text; return element;
  }
  function link(item: GuideMetadata, className = 'guide-nav-link'): HTMLAnchorElement {
    const element = node('a', className, item.title) as HTMLAnchorElement;
    element.href = guideRoute(item.path); element.dataset.guidePath = item.path;
    if (item.path === guide.path) element.setAttribute('aria-current', 'page');
    return element;
  }
  const root = node('div', 'guide-handbook');
  const sidebar = node('aside', 'guide-sidebar');
  const label = node('label', 'guide-search-label', 'Search handbook');
  const search = node('input', 'guide-search') as HTMLInputElement;
  search.type = 'search'; search.placeholder = 'Search guides…'; search.autocomplete = 'off'; label.append(search);
  const count = node('p', 'guide-search-count'); count.setAttribute('role', 'status');
  const navigation = node('nav', 'guide-navigation'); navigation.setAttribute('aria-label', 'Handbook');
  const home = guides.find(item => item.category === 'Start Here'); if (home) navigation.append(link(home));
  for (const category of GUIDE_CATEGORIES) {
    const group = node('div', 'guide-nav-group'); group.append(node('h2', 'guide-nav-heading', category));
    guides.filter(item => item.category === category).forEach(item => group.append(link(item))); navigation.append(group);
  }
  sidebar.append(label, count, navigation);
  const main = node('div', 'guide-main');
  const breadcrumb = node('p', 'guide-breadcrumb', guide.category === 'Start Here' ? 'Handbook · Start Here' : `Handbook · ${guide.category}`);
  const prose = node('article', 'guide-prose');
  const markdown = new Marked({ async: false, gfm: true });
  markdown.use({ extensions: [{ name: 'guideWiki', level: 'inline', start(source) { return source.indexOf('[['); },
    tokenizer(source) {
      if (this.lexer.state.inRawBlock || this.lexer.state.inLink) return undefined;
      const match = /^\[\[([^\]\n]+)\]\]/.exec(source);
      return match ? { type: 'guideWiki', raw: match[0], value: match[1] } : undefined;
    }, renderer(token) {
      const { target, label } = splitWikiLink(String(token.value));
      const href = resolveGuideLink(target, guide.path, guides);
      return href ? `<a href="${escapeHtml(legacyGuideHref(href)!)}">${escapeHtml(label)}</a>` : escapeHtml(label);
    } }], renderer: { image({ text }) { return `<span class="guide-image-fallback">${escapeHtml(text || 'Image unavailable in the web handbook')}</span>`; } } });
  const purifier = createDOMPurify(document.defaultView!);
  prose.innerHTML = purifier.sanitize(markdown.parse(guide.body) as string, {
    USE_PROFILES: { html: true }, FORBID_TAGS: ['img', 'style', 'form', 'input', 'button', 'iframe', 'video', 'audio', 'source'],
    FORBID_ATTR: ['style', 'id', 'name', 'src', 'srcset'],
  });
  for (const anchor of prose.querySelectorAll('a')) {
    const href = anchor.getAttribute('href') || '';
    if (!href || anchor.closest('pre, code')) { anchor.replaceWith(document.createTextNode(anchor.textContent || '')); continue; }
    if (href.startsWith('/api/docs/')) continue;
    if (/^(https?:|mailto:)/i.test(href)) { anchor.rel = 'noopener noreferrer'; continue; }
    const resolved = href.startsWith('#guide/') ? href : resolveGuideLink(href, guide.path, guides);
    const route = href === '#reference' ? '/api/docs/reference/' : href === '#guides' ? '/api/docs/' : resolved ? legacyGuideHref(resolved) : null;
    if (route) anchor.href = route; else anchor.replaceWith(document.createTextNode(anchor.textContent || href));
  }
  const toc = node('nav', 'guide-toc'); toc.setAttribute('aria-label', 'On this page'); toc.append(node('p', 'guide-toc-title', 'On this page'));
  const occurrences = new Map<string, number>();
  for (const heading of prose.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')) {
    const title = heading.textContent || ''; const base = headingSlug(title) || 'section'; const occurrence = occurrences.get(base) || 0;
    occurrences.set(base, occurrence + 1); const slug = occurrence ? `${base}-${occurrence}` : base;
    heading.id = `guide-heading-${slug}`; heading.dataset.guideHeading = slug; heading.dataset.guideTitle = title; heading.tabIndex = -1;
    const self = node('a', 'guide-heading-link', '#') as HTMLAnchorElement; self.href = guideRoute(guide.path, slug); self.setAttribute('aria-label', `Link to ${title}`); heading.append(self);
    if (heading.tagName !== 'H1') { const anchor = node('a', `guide-toc-link guide-toc-${heading.tagName.toLowerCase()}`, title) as HTMLAnchorElement; anchor.href = self.getAttribute('href')!; toc.append(anchor); }
  }
  toc.hidden = toc.childElementCount <= 1;
  const pagination = node('nav', 'guide-pagination'); pagination.setAttribute('aria-label', 'Previous and next guides');
  for (const [offset, title] of [[-1, 'Previous'], [1, 'Next']] as const) {
    const neighbor = guides[guide.order + offset]; if (!neighbor) { pagination.append(node('span')); continue; }
    const anchor = link(neighbor, 'guide-page-link'); anchor.replaceChildren(node('span', 'guide-page-label', title), node('span', '', neighbor.title)); pagination.append(anchor);
  }
  main.append(breadcrumb, prose, pagination); root.append(sidebar, main, toc); return root;
}