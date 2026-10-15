import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useSite } from '../lib/site';
import { useLanguage } from '../i18n/LanguageContext';
import { isSet } from '../lib/content';
import { isPageVisible } from '../lib/pages';
import { PAGE_PATHS } from '../lib/seo';
import { ContactDetails, SocialLinks } from './ContactDetails';
import { NAV_ITEMS } from './Header';
import { Img } from './Img';

export function Footer() {
  const config = useSite();
  const { s, t } = useLanguage();
  // Start with the build year (matches the pre-rendered HTML), then use today's year.
  const [year, setYear] = useState(__BUILD_YEAR__);
  useEffect(() => setYear(new Date().getFullYear()), []);
  const name = t(config.school.name);
  const affiliation = t(config.school.affiliation);

  return (
    <footer className="site-footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <Img image={config.school.logo} className="footer__logo" decorative />
          <p className="footer__name">{name}</p>
          <p className="footer__tagline">{t(config.school.tagline)}</p>
          {isSet(affiliation) && (
            <p className="footer__meta">
              {affiliation}
              {isSet(config.school.affiliationNumber) && ` · ${config.school.affiliationNumber}`}
            </p>
          )}
          <SocialLinks />
        </div>

        <nav aria-labelledby="footer-links-heading" className="footer__links">
          <h2 id="footer-links-heading" className="footer__heading">
            {s.footer.quickLinks}
          </h2>
          <ul>
            {NAV_ITEMS.filter((k) => k !== 'home' && isPageVisible(config, k)).map((key) => (
              <li key={key}>
                <Link to={PAGE_PATHS[key]}>{s.nav[key]}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer__contact">
          <h2 className="footer__heading">{s.contact.getInTouch}</h2>
          <ContactDetails showHours={false} compact />
        </div>
      </div>

      <div className="footer__bottom">
        <div className="container footer__bottom-inner">
          <p>
            © {year} {name}. {s.footer.rights}
          </p>
          <ul>
            <li>
              <Link to={PAGE_PATHS.privacy}>{s.nav.privacy}</Link>
            </li>
            <li>
              <Link to={PAGE_PATHS.terms}>{s.nav.terms}</Link>
            </li>
            <li>
              <Link to="/portal/student-login">{s.nav.studentLogin}</Link>
            </li>
            <li>
              <Link to="/portal/login">{s.nav.portal}</Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
