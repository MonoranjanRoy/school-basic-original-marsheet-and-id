import { Link } from 'react-router';
import { ContactDetails, SocialLinks } from '../components/ContactDetails';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { Section } from '../components/Section';
import { useSite } from '../lib/site';
import { useLanguage } from '../i18n/LanguageContext';
import { mapsEmbedSrc, mapsHref, whatsappHref } from '../lib/contact';
import { isPageVisible } from '../lib/pages';
import { PAGE_PATHS, usePageMeta } from '../lib/seo';

export default function Contact() {
  const config = useSite();
  usePageMeta('contact');
  const { s, t } = useLanguage();
  const maps = mapsHref(config, config.contact.address.map((l) => t(l)));
  const embed = mapsEmbedSrc(config);
  const wa = whatsappHref(config, t(config.contact.whatsappGreeting));

  return (
    <>
      <PageHeader title={s.nav.contact} intro={s.pageIntro.contact} />
      <Section>
        <div className="split">
          <div>
            <h2 className="section__title">{s.contact.getInTouch}</h2>
            <ContactDetails />
            <SocialLinks />
          </div>

          <div className="contact-side">
            {embed && (
              <div className="map-frame">
                <iframe
                  src={embed}
                  title={`${s.contact.map} — ${t(config.school.name)}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            )}
            {embed && <p className="small muted">{s.contact.mapNote}</p>}

            <div className="button-stack">
              {maps && (
                <a href={maps} className="btn btn--primary" target="_blank" rel="noopener noreferrer">
                  <Icon name="pin" />
                  {s.cta.getDirections}
                  <span className="visually-hidden"> {s.opensNewTab}</span>
                </a>
              )}
              {wa && (
                <a href={wa} className="btn btn--whatsapp" target="_blank" rel="noopener noreferrer">
                  <Icon name="whatsapp" />
                  {s.cta.chatOnWhatsApp}
                  <span className="visually-hidden"> {s.opensNewTab}</span>
                </a>
              )}
            </div>

            {isPageVisible(config, 'admissions') && (
            <div className="cta-card">
              <h2>{s.contact.enquiryPrompt}</h2>
              <Link to={`${PAGE_PATHS.admissions}#enquiry`} className="btn btn--accent">
                {s.cta.enquire}
              </Link>
            </div>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}
