import { Link } from 'react-router';
import { ContactDetails } from '../components/ContactDetails';
import { Gallery } from '../components/Gallery';
import { Icon, type IconName } from '../components/Icon';
import { Img } from '../components/Img';
import { NoticeList } from '../components/NoticeList';
import { Signatory } from '../components/PersonCard';
import { Section } from '../components/Section';
import { useSite } from '../lib/site';
import { useLanguage } from '../i18n/LanguageContext';
import { isSet } from '../lib/content';
import { enquiryLink } from '../components/Header';
import { isPageVisible } from '../lib/pages';
import { PAGE_PATHS, usePageMeta } from '../lib/seo';

const EXPLORE: { key: 'about' | 'academics' | 'facilities' | 'faculty'; icon: IconName }[] = [
  { key: 'about', icon: 'building' },
  { key: 'academics', icon: 'book' },
  { key: 'facilities', icon: 'image' },
  { key: 'faculty', icon: 'users' },
];

export default function Home() {
  const config = useSite();
  usePageMeta('home');
  const { s, t } = useLanguage();
  const { home, admissions, school } = config;
  const enquiryHref = enquiryLink(config);
  const show = (key: Parameters<typeof isPageVisible>[1]) => isPageVisible(config, key);
  const explore = EXPLORE.filter(({ key }) => show(key));

  return (
    <>
      <section className="hero" aria-labelledby="page-title">
        <Img image={home.heroImage} className="hero__img" priority sizes="100vw" />
        <div className="hero__overlay" />
        <div className="container hero__content">
          {isSet(school.established) && (
            <p className="hero__eyebrow">
              {s.home.established} {school.established}
            </p>
          )}
          <h1 id="page-title">{t(home.heroTitle)}</h1>
          <p className="hero__text">{t(home.heroText)}</p>
          <div className="hero__actions">
            <Link to={enquiryHref} className="btn btn--accent btn--lg">
              {s.cta.enquire}
            </Link>
            <Link to={PAGE_PATHS.contact} className="btn btn--ghost btn--lg">
              {s.cta.contactUs}
            </Link>
          </div>
        </div>
      </section>

      {admissions.open && show('admissions') && (
        <div className="admission-strip">
          <div className="container admission-strip__inner">
            <p>
              <Icon name="megaphone" />
              <strong>{s.home.admissionsOpen}</strong>
              <span>
                {' '}
                — {s.home.forSession} {t(admissions.session)}
              </span>
            </p>
            <Link to={PAGE_PATHS.admissions} className="btn btn--primary btn--sm">
              {s.cta.learnMore}
              <Icon name="arrowRight" size={18} />
            </Link>
          </div>
        </div>
      )}

      {home.highlights.length > 0 && (
        <Section id="highlights" title={s.home.explore} hideTitle>
          <ul className="highlights">
            {home.highlights.map((h, i) => (
              <li key={i} className="highlight">
                <h3>{t(h.title)}</h3>
                <p>{t(h.text)}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section id="welcome" title={t(home.welcome.heading)} tone="muted">
        <div className="prose">
          {home.welcome.paragraphs.map((p, i) => (
            <p key={i}>{t(p)}</p>
          ))}
        </div>
        {home.welcome.signatory && <Signatory person={home.welcome.signatory} />}
      </Section>

      {explore.length > 0 && (
      <Section id="explore" title={s.home.explore}>
        <ul className="card-grid card-grid--4">
          {explore.map(({ key, icon }) => (
            <li key={key}>
              <Link to={PAGE_PATHS[key]} className="card card--link explore-card">
                <span className="explore-card__icon">
                  <Icon name={icon} size={28} />
                </span>
                <span className="explore-card__title">{s.nav[key]}</span>
                <span className="explore-card__text">{s.pageIntro[key]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      )}

      {show('notices') && (
      <Section id="latest-notices" title={s.home.latestNotices} tone="muted">
        <NoticeList limit={3} />
        <p className="section__more">
          <Link to={PAGE_PATHS.notices} className="link-arrow">
            {s.cta.viewAllNotices}
            <Icon name="arrowRight" size={18} />
          </Link>
        </p>
      </Section>
      )}

      {config.gallery.items.length > 0 && show('gallery') && (
        <Section id="gallery-preview" title={s.home.galleryPreview}>
          <Gallery limit={3} />
          <p className="section__more">
            <Link to={PAGE_PATHS.gallery} className="link-arrow">
              {s.cta.viewGallery}
              <Icon name="arrowRight" size={18} />
            </Link>
          </p>
        </Section>
      )}

      <Section id="visit" title={s.home.visitUs} tone="muted">
        <div className="split">
          <ContactDetails />
          <div className="cta-card">
            <h3>{s.contact.enquiryPrompt}</h3>
            <p>{t(admissions.intro)}</p>
            <Link to={enquiryHref} className="btn btn--primary">
              {s.cta.enquire}
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
