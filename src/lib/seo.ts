import { useEffect } from 'react';
import type { Language, SchoolConfig } from '../config/types';
import { resolveText, useLanguage } from '../i18n/LanguageContext';
import { strings } from '../i18n/strings';
import { asset, isSet } from './content';
import { emailAddress, telHref } from './contact';
import { useSite } from './site';

export type PageKey =
  | 'home'
  | 'about'
  | 'academics'
  | 'facilities'
  | 'faculty'
  | 'gallery'
  | 'notices'
  | 'admissions'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'results'
  | 'notFound';

/** Public URL of every page. Trailing slashes match the pre-rendered folders. */
export const PAGE_PATHS: Record<Exclude<PageKey, 'notFound'>, string> = {
  home: '/',
  about: '/about/',
  academics: '/academics/',
  facilities: '/facilities/',
  faculty: '/faculty/',
  gallery: '/gallery/',
  notices: '/notices/',
  admissions: '/admissions/',
  contact: '/contact/',
  privacy: '/privacy-policy/',
  terms: '/terms/',
  results: '/results/',
};

export interface PageMeta {
  title: string;
  description: string;
  path: string | null;
}

export function pageMeta(key: PageKey, lang: Language, config: SchoolConfig): PageMeta {
  const s = strings[lang];
  const school = resolveText(config.school.name, lang);
  if (key === 'home') {
    const tagline = resolveText(config.school.tagline, lang);
    return {
      title: isSet(tagline) ? `${school} — ${tagline}` : school,
      description: resolveText(config.school.seoDescription, lang),
      path: PAGE_PATHS.home,
    };
  }
  if (key === 'notFound') {
    return { title: `${s.notFound.title} | ${school}`, description: s.notFound.text, path: null };
  }
  return {
    title: `${s.nav[key]} | ${school}`,
    description: `${s.pageIntro[key]} ${school}.`,
    path: PAGE_PATHS[key],
  };
}

function absoluteUrl(config: SchoolConfig, path: string): string | null {
  const site = config.siteUrl.replace(/\/$/, '');
  if (!/^https?:\/\//.test(site)) return null;
  return site + path;
}

function shareImageUrl(config: SchoolConfig): string | null {
  const img = config.school.socialShareImage;
  if (!isSet(img)) return null;
  return /^https?:\/\//.test(img) ? img : absoluteUrl(config, img);
}

const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** schema.org data describing the school, built only from filled-in values. */
export function schoolJsonLd(lang: Language, config: SchoolConfig): Record<string, unknown> | null {
  const name = resolveText(config.school.name, lang);
  if (!isSet(name)) return null;
  const address = config.contact.address.map((l) => resolveText(l, lang));
  const sameAs = Object.values(config.social).filter(isSet);
  const data: Record<string, unknown> = { '@context': 'https://schema.org', '@type': 'School', name };
  const url = absoluteUrl(config, '/');
  if (url) data.url = url;
  const logo = absoluteUrl(config, config.school.logo.src);
  if (logo && isSet(config.school.logo.src)) data.logo = logo;
  const desc = resolveText(config.school.seoDescription, lang);
  if (isSet(desc)) data.description = desc;
  if (address.length && address.every(isSet)) {
    data.address = { '@type': 'PostalAddress', streetAddress: address.join(', ') };
  }
  const phone = config.contact.phones.find((p) => telHref(p.number));
  if (phone) data.telephone = phone.number;
  const email = emailAddress(config);
  if (email) data.email = email;
  if (isSet(config.school.established)) data.foundingDate = config.school.established;
  if (sameAs.length) data.sameAs = sameAs;
  return data;
}

/** <head> tags for a pre-rendered page. */
export function headTags(key: PageKey, lang: Language, config: SchoolConfig): string {
  const meta = pageMeta(key, lang, config);
  const canonical = meta.path ? absoluteUrl(config, meta.path) : null;
  const image = shareImageUrl(config);
  const school = resolveText(config.school.name, lang);
  const tags = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(school)}">`,
    `<meta property="og:title" content="${esc(meta.title)}">`,
    `<meta property="og:description" content="${esc(meta.description)}">`,
    `<meta property="og:locale" content="${lang === 'bn' ? 'bn_IN' : 'en_IN'}">`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
    `<meta name="theme-color" content="${esc(config.theme.primary)}">`,
    `<link rel="icon" href="${esc(asset(config.school.logo.src))}">`,
  ];
  if (canonical) {
    tags.push(`<link rel="canonical" href="${esc(canonical)}">`, `<meta property="og:url" content="${esc(canonical)}">`);
  }
  if (image) tags.push(`<meta property="og:image" content="${esc(image)}">`);
  if (key === 'notFound') tags.push('<meta name="robots" content="noindex">');
  if (key === 'home' || key === 'contact') {
    const ld = schoolJsonLd(lang, config);
    if (ld) {
      tags.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`);
    }
  }
  return tags.join('\n    ');
}

function setMeta(selector: string, attr: 'content' | 'href', value: string) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

/** Keeps the title and description in sync during in-browser navigation. */
export function usePageMeta(key: PageKey) {
  const { lang } = useLanguage();
  const config = useSite();
  useEffect(() => {
    const meta = pageMeta(key, lang, config);
    document.title = meta.title;
    setMeta('meta[name="description"]', 'content', meta.description);
    setMeta('meta[property="og:title"]', 'content', meta.title);
    setMeta('meta[property="og:description"]', 'content', meta.description);
    const canonical = meta.path ? absoluteUrl(config, meta.path) : null;
    if (canonical) {
      setMeta('link[rel="canonical"]', 'href', canonical);
      setMeta('meta[property="og:url"]', 'content', canonical);
    }
  }, [key, lang, config]);
}
