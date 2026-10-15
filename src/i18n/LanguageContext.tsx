import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Language, LocalizedText } from '../config/types';
import { useSite } from '../lib/site';
import { strings, type Strings } from './strings';

const STORAGE_KEY = 'site-language';

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  /** Fixed interface strings for the current language. */
  s: Strings;
  /** Resolve a config text value for the current language. */
  t: (text: LocalizedText | undefined) => string;
  /** Format an ISO date (YYYY-MM-DD) for display. */
  formatDate: (iso: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function resolveText(text: LocalizedText | undefined, lang: Language): string {
  if (text == null) return '';
  if (typeof text === 'string') return text;
  return (lang === 'bn' && text.bn) || text.en;
}

export function formatIsoDate(iso: string, lang: Language): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  // Fixed UTC time zone so pre-rendered and browser output always match.
  return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-IN' : 'en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function readStoredLanguage(): Language | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'en' || v === 'bn' ? v : null;
  } catch {
    return null;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const config = useSite();
  const initial: Language = config.enableBengali ? config.defaultLanguage : 'en';
  // Always start with the default so the browser matches the pre-rendered HTML,
  // then switch to the visitor's saved choice after hydration.
  const [lang, setLangState] = useState<Language>(initial);

  useEffect(() => {
    if (!config.enableBengali) return;
    const stored = readStoredLanguage();
    if (stored && stored !== lang) setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable (private mode) — the choice lasts for this visit only */
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      s: strings[lang],
      t: (text) => resolveText(text, lang),
      formatDate: (iso) => formatIsoDate(iso, lang),
    }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
