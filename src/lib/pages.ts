import type { HideablePage, SchoolConfig } from '../config/types';
import type { PageKey } from './seo';

const ALWAYS_SHOWN: PageKey[] = ['home', 'contact', 'privacy', 'terms', 'results', 'notFound'];

/** Whether the head teacher has this page switched on. */
export function isPageVisible(config: SchoolConfig, key: PageKey): boolean {
  if (ALWAYS_SHOWN.includes(key)) return true;
  return config.pages?.[key as HideablePage] !== false;
}
