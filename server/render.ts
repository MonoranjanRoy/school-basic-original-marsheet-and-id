import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Request, Response } from 'express';
import type { SchoolConfig } from '../src/config/types';
import type { PageKey } from '../src/lib/seo';
import { getPublicSite } from './siteData.js';

interface SsrModule {
  render(url: string, site: SchoolConfig): string;
  head(key: PageKey, site: SchoolConfig): string;
  htmlLang(site: SchoolConfig): string;
  pageForPath(pathname: string, site: SchoolConfig): PageKey;
  visiblePaths(site: SchoolConfig): string[];
}

export const distDir = path.resolve(process.cwd(), 'dist');
const ssrPath = path.resolve(process.cwd(), 'build', 'ssr', 'entry-server.js');

let template = '';
let ssr: SsrModule | null = null;

/** Loads the built frontend. Returns false when it has not been built (development). */
export async function loadFrontend(): Promise<boolean> {
  const templatePath = path.join(distDir, 'index.html');
  if (!fs.existsSync(templatePath) || !fs.existsSync(ssrPath)) return false;
  template = fs.readFileSync(templatePath, 'utf8');
  ssr = (await import(/* @vite-ignore */ pathToFileURL(ssrPath).href)) as SsrModule;
  return true;
}

const escapeHtml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Data goes in a non-executed <script type="application/json">; escaping "<" prevents breaking out of it.
const LT_ESCAPE = String.fromCharCode(92) + 'u003c'; // backslash + "u003c": JSON-escaped "<"
const jsonForScript = (v: unknown) => JSON.stringify(v).replace(/</g, LT_ESCAPE);

function page(site: SchoolConfig, headHtml: string, bodyHtml: string, renderedPath: string | null): string {
  const rootAttr = renderedPath ? ` data-rendered="${escapeHtml(renderedPath)}"` : '';
  return template
    .replace(/<html lang="[^"]*">/, `<html lang="${ssr!.htmlLang(site)}">`)
    .replace(/<!--head-start-->[\s\S]*?<!--head-end-->/, () => headHtml)
    .replace('<div id="root">', `<div id="root"${rootAttr}>`)
    .replace('<!--app-html-->', () => bodyHtml)
    .replace('</body>', () => `<script id="site-data" type="application/json">${jsonForScript(site)}</script>\n</body>`);
}

/**
 * Rendered pages, reused until the website content changes. Rendering React
 * is the most expensive work the server does, so with thousands of visitors
 * each page is rendered once, not once per visitor.
 */
const htmlCache = new Map<string, { site: SchoolConfig; status: number; html: string }>();

function cached(key: string, site: SchoolConfig, build: () => { status: number; html: string }) {
  const hit = htmlCache.get(key);
  if (hit && hit.site === site) return hit;
  // Unknown addresses (404s) are not cached, so random URLs cannot fill memory.
  const entry = { site, ...build() };
  if (entry.status === 200) {
    if (htmlCache.size > 500) htmlCache.clear();
    htmlCache.set(key, entry);
  }
  return entry;
}

export async function renderPage(req: Request, res: Response): Promise<void> {
  const site = await getPublicSite();
  const pathname = req.path;
  res.set('Cache-Control', 'no-cache');

  // Portal: rendered in the browser only, never indexed.
  if (pathname === '/portal' || pathname.startsWith('/portal/')) {
    const { html } = cached('portal', site, () => {
      const name = typeof site.school.name === 'string' ? site.school.name : site.school.name.en;
      const headHtml = [
        `<title>Portal | ${escapeHtml(name)}</title>`,
        '<meta name="robots" content="noindex, nofollow">',
        `<link rel="icon" href="${escapeHtml(site.school.logo.src)}">`,
      ].join('\n    ');
      return { status: 200, html: page(site, headHtml, '', null) };
    });
    res.type('html').send(html);
    return;
  }

  const key = ssr!.pageForPath(pathname, site);
  // One address per page: /about → /about/
  if (key !== 'notFound' && !pathname.endsWith('/')) {
    const query = req.originalUrl.slice(req.path.length);
    res.redirect(301, `${pathname}/${query}`);
    return;
  }
  const normalised = pathname.replace(/\/?$/, '/');
  const { status, html } = cached(normalised, site, () => ({
    status: key === 'notFound' ? 404 : 200,
    html: page(site, ssr!.head(key, site), ssr!.render(normalised, site), normalised),
  }));
  res.status(status).type('html').send(html);
}

export async function sitemap(_req: Request, res: Response): Promise<void> {
  const site = await getPublicSite();
  const base = site.siteUrl.replace(/\/$/, '');
  if (!/^https?:\/\//.test(base)) {
    res.status(404).type('text').send('Set the website address in the portal (Website → School & branding) to enable the sitemap.');
    return;
  }
  const urls = ssr!
    .visiblePaths(site)
    .map((p) => `  <url><loc>${escapeHtml(base + p)}</loc></url>`)
    .join('\n');
  res
    .type('application/xml')
    .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}

export async function robots(_req: Request, res: Response): Promise<void> {
  const site = await getPublicSite();
  const base = site.siteUrl.replace(/\/$/, '');
  const lines = ['User-agent: *', 'Allow: /', 'Disallow: /portal', 'Disallow: /api/'];
  if (/^https?:\/\//.test(base)) lines.push('', `Sitemap: ${base}/sitemap.xml`);
  res.type('text').send(lines.join('\n') + '\n');
}
