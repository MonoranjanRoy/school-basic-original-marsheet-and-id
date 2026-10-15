import { useEffect, useRef, type CSSProperties } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useSite } from '../lib/site';
import { useLanguage } from '../i18n/LanguageContext';
import { Footer } from './Footer';
import { Header } from './Header';
import { SetupBanner } from './SetupBanner';
import { WhatsAppButton } from './WhatsAppButton';

export function Layout() {
  const config = useSite();
  const { s, lang } = useLanguage();
  const { pathname, hash } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // On navigation: scroll to the top (or to the #anchor) and move focus to the
  // new content so keyboard and screen-reader users start in the right place.
  useEffect(() => {
    const isFirst = firstRender.current;
    firstRender.current = false;
    if (isFirst && !hash) return;
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.scrollIntoView();
    } else if (!isFirst) {
      window.scrollTo(0, 0);
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [pathname, hash]);

  const themeVars = {
    '--color-primary': config.theme.primary,
    '--color-primary-dark': config.theme.primaryDark,
    '--color-accent': config.theme.accent,
  } as CSSProperties;

  return (
    <div className={`site lang-${lang}`} style={themeVars}>
      <a className="skip-link" href="#main">
        {s.skipToContent}
      </a>
      <SetupBanner />
      <Header />
      <main id="main" ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
