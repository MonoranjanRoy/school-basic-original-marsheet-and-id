import { createContext, useContext, type ReactNode } from 'react';
import type { SchoolConfig } from '../config/types';

/**
 * The website content, loaded from the server (edited by the head teacher
 * in the staff portal). Provided once at the top of the app.
 */
const SiteContext = createContext<SchoolConfig | null>(null);

export function SiteProvider({ site, children }: { site: SchoolConfig; children: ReactNode }) {
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}

export function useSite(): SchoolConfig {
  const site = useContext(SiteContext);
  if (!site) throw new Error('useSite must be used inside <SiteProvider>');
  return site;
}
