/**
 * Server-side rendering of public pages (imported by server/render.ts).
 */
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App from './App';
import type { SchoolConfig } from './config/types';
import { isPageVisible } from './lib/pages';
import { headTags, PAGE_PATHS, type PageKey } from './lib/seo';

export function render(url: string, site: SchoolConfig): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App site={site} />
      </StaticRouter>
    </StrictMode>,
  );
}

export function htmlLang(site: SchoolConfig): string {
  return site.enableBengali ? site.defaultLanguage : 'en';
}

export function head(key: PageKey, site: SchoolConfig): string {
  return headTags(key, site.enableBengali ? site.defaultLanguage : 'en', site);
}

/** Which page a path shows, or 'notFound' (also for pages the head teacher has hidden). */
export function pageForPath(pathname: string, site: SchoolConfig): PageKey {
  const normalised = pathname.replace(/\/?$/, '/');
  const entry = Object.entries(PAGE_PATHS).find(([, path]) => path === normalised);
  if (!entry) return 'notFound';
  const key = entry[0] as PageKey;
  return isPageVisible(site, key) ? key : 'notFound';
}

/** Paths of visible pages, for sitemap.xml. */
export function visiblePaths(site: SchoolConfig): string[] {
  return Object.entries(PAGE_PATHS)
    .filter(([key]) => isPageVisible(site, key as PageKey))
    .map(([, path]) => path);
}
