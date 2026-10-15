import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import type { SchoolConfig } from '../config/types';
import { useSite } from '../lib/site';
import { useLanguage } from '../i18n/LanguageContext';
import { emailAddress, telHref } from '../lib/contact';
import { isPageVisible } from '../lib/pages';
import { PAGE_PATHS } from '../lib/seo';
import { Icon } from './Icon';
import { Img } from './Img';
import { LanguageToggle } from './LanguageToggle';

export const NAV_ITEMS = [
  'home',
  'about',
  'academics',
  'facilities',
  'faculty',
  'gallery',
  'notices',
  'admissions',
  'contact',
] as const;

/** Where "Enquire now" buttons go: the enquiry form, or Contact if Admissions is hidden. */
export function enquiryLink(config: SchoolConfig): string {
  return isPageVisible(config, 'admissions') ? `${PAGE_PATHS.admissions}#enquiry` : PAGE_PATHS.contact;
}

export function Header() {
  const config = useSite();
  const { s, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const toggleRef = useRef<HTMLButtonElement>(null);

  const navItems = NAV_ITEMS.filter((key) => isPageVisible(config, key));
  const enquiryHref = enquiryLink(config);
  const phone = config.contact.phones.find((p) => telHref(p.number));
  const email = emailAddress(config);

  // Close the mobile menu after navigating.
  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [open]);

  return (
    <header className="site-header">
      <div className="topbar">
        <div className="container topbar__inner">
          <div className="topbar__contact">
            {phone && (
              <a href={telHref(phone.number)!}>
                <Icon name="phone" size={16} />
                <span>{phone.number}</span>
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`}>
                <Icon name="mail" size={16} />
                <span>{email}</span>
              </a>
            )}
          </div>
          <div className="topbar__end">
            <Link to={PAGE_PATHS.results} className="topbar__result">
              <Icon name="book" size={16} />
              <span>{s.nav.results}</span>
            </Link>
            <LanguageToggle className="lang-toggle--light" />
          </div>
        </div>
      </div>

      <div className="mainbar">
        <div className="container mainbar__inner">
          <Link to={PAGE_PATHS.home} className="brand">
            <Img image={config.school.logo} className="brand__logo" priority decorative />
            <span className="brand__text">
              <span className="brand__name">{t(config.school.name)}</span>
              <span className="brand__tagline">{t(config.school.tagline)}</span>
            </span>
          </Link>

          <nav className="nav-desktop" aria-label={s.mainNav}>
            <ul>
              {navItems.map((key) => (
                <li key={key}>
                  <NavLink to={PAGE_PATHS[key]} end={key === 'home'}>
                    {s.nav[key]}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <Link to={enquiryHref} className="btn btn--accent mainbar__cta">
            {s.cta.enquireNow}
          </Link>

          <button
            ref={toggleRef}
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'close' : 'menu'} size={24} />
            <span className="visually-hidden">{open ? s.closeMenu : s.openMenu}</span>
          </button>
        </div>
      </div>

      <div id="mobile-menu" className={`mobile-menu${open ? ' is-open' : ''}`} hidden={!open}>
        <nav aria-label={s.mainNav}>
          <ul>
            {navItems.map((key) => (
              <li key={key}>
                <NavLink to={PAGE_PATHS[key]} end={key === 'home'}>
                  {s.nav[key]}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mobile-menu__footer">
          <Link to={PAGE_PATHS.results} className="btn btn--outline btn--block">
            {s.nav.results}
          </Link>
          <Link to={enquiryHref} className="btn btn--accent btn--block">
            {s.cta.enquireNow}
          </Link>
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
