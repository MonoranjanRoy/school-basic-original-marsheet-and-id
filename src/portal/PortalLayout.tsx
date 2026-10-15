import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { Img } from '../components/Img';
import { resolveText } from '../i18n/LanguageContext';
import { useSite } from '../lib/site';
import { ROLE_LABELS, useAuth, type Role } from './auth';

interface NavItem {
  to: string;
  label: string;
  roles: Role[];
}

const NAV: NavItem[] = [
  { to: '/portal', label: 'Dashboard', roles: ['head_teacher', 'faculty', 'student'] },
  { to: '/portal/my-results', label: 'My results', roles: ['student'] },
  { to: '/portal/notices', label: 'Notices', roles: ['head_teacher', 'faculty', 'student'] },
  { to: '/portal/gallery', label: 'Gallery', roles: ['head_teacher', 'faculty'] },
  { to: '/portal/profile', label: 'My profile', roles: ['faculty'] },
  { to: '/portal/website', label: 'Website content', roles: ['head_teacher'] },
  { to: '/portal/faculty', label: 'Faculty profiles', roles: ['head_teacher'] },
  { to: '/portal/media', label: 'Photos & files', roles: ['head_teacher'] },
  { to: '/portal/results', label: 'Results', roles: ['head_teacher'] },
  { to: '/portal/users', label: 'Accounts', roles: ['head_teacher'] },
  { to: '/portal/activity', label: 'Activity log', roles: ['head_teacher'] },
  { to: '/portal/account', label: 'My account', roles: ['head_teacher', 'faculty', 'student'] },
];

export function PortalLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const site = useSite();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.lang = 'en';
  }, []);

  if (!user) return null;
  const items = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <div className="portal">
      <a className="skip-link" href="#portal-main">
        Skip to main content
      </a>
      <header className="portal-top">
        <Link to="/portal" className="portal-brand">
          <Img image={site.school.logo} className="portal-brand__logo" decorative />
          <span>
            <span className="portal-brand__name">{resolveText(site.school.name, 'en')}</span>
            <span className="portal-brand__sub">Portal</span>
          </span>
        </Link>
        <div className="portal-top__right">
          <span className="portal-user">
            {user.displayName} <span className="portal-role">{ROLE_LABELS[user.role]}</span>
          </span>
          <a href="/" className="pbtn pbtn--ghost portal-top__site" target="_blank" rel="noopener">
            View website
          </a>
          <button
            type="button"
            className="pbtn pbtn--ghost"
            onClick={() => logout()}
          >
            Sign out
          </button>
          <button
            type="button"
            className="pbtn pbtn--ghost portal-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="portal-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            Menu
          </button>
        </div>
      </header>
      <div className="portal-body">
        <nav id="portal-nav" className={`portal-nav${menuOpen ? ' is-open' : ''}`} aria-label="Portal">
          <ul>
            {items.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.to === '/portal'}>
                  {n.label}
                </NavLink>
              </li>
            ))}
            <li className="portal-nav__site">
              <a href="/" target="_blank" rel="noopener">
                View website ↗
              </a>
            </li>
          </ul>
        </nav>
        <main id="portal-main" className="portal-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
