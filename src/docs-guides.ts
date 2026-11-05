import manifest from '../manifest.json?raw';
import { createGuideMetadata } from './guide-links';
const sources = import.meta.glob<string>('../content/**/*.md', { query: '?raw', import: 'default', eager: true });
const prefix = '../content/';
export const guides = createGuideMetadata(manifest, Object.fromEntries(Object.entries(sources).map(([path, body]) => {
  const guidePath = path.slice(prefix.length); return [guidePath, body];
})));

/** Enhance existing readable HTML; never clear it while importing or on failure. */
export function mountGuides(container: HTMLElement): { destroy(): void } {
  const search = container.querySelector<HTMLInputElement>('.guide-search');
  const navigation = container.querySelector<HTMLElement>('.guide-navigation');
  const count = container.querySelector<HTMLElement>('.guide-search-count');
  const empty = document.createElement('p'); empty.className = 'guide-no-results'; empty.textContent = 'No matching guides. Try another search.'; empty.hidden = true; navigation?.append(empty);
  function filter() {
    const terms = (search?.value || '').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const matches = new Set(guides.filter(guide => terms.every(term => `${guide.title}\n${guide.body}`.toLocaleLowerCase().includes(term))).map(guide => guide.path));
    navigation?.querySelectorAll<HTMLAnchorElement>('[data-guide-path]').forEach(link => { link.hidden = !matches.has(link.dataset.guidePath!); });
    navigation?.querySelectorAll<HTMLElement>('.guide-nav-group').forEach(group => { group.hidden = !group.querySelector('a:not([hidden])'); });
    empty.hidden = matches.size > 0;
    if (count) count.textContent = terms.length ? `${matches.size} guide${matches.size === 1 ? '' : 's'} found${matches.size ? '' : '. Try another search.'}` : '';
  }
  search?.addEventListener('input', filter);
  filter();
  return { destroy() { search?.removeEventListener('input', filter); empty.remove(); } };
}