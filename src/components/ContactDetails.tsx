import { useSite } from '../lib/site';
import { useLanguage } from '../i18n/LanguageContext';
import { isSet } from '../lib/content';
import { emailAddress, mapsHref, telHref, whatsappHref } from '../lib/contact';
import { Icon } from './Icon';

/**
 * School address, phone, email, WhatsApp and office hours. Values that are
 * still placeholders are shown as plain text and never turned into links.
 */
export function ContactDetails({ showHours = true, compact = false }: { showHours?: boolean; compact?: boolean }) {
  const config = useSite();
  const { s, t } = useLanguage();
  const address = config.contact.address.map((line) => t(line));
  const maps = mapsHref(config, address);
  const email = emailAddress(config);
  const wa = whatsappHref(config, t(config.contact.whatsappGreeting));

  return (
    <ul className={`contact-list${compact ? ' contact-list--compact' : ''}`}>
      <li>
        <Icon name="pin" />
        <div>
          <span className="contact-list__label">{s.contact.address}</span>
          <address>
            {address.map((line, i) => (
              <span key={i} className="contact-list__line">
                {line}
              </span>
            ))}
          </address>
          {maps && (
            <a href={maps} target="_blank" rel="noopener noreferrer" className="link-inline">
              {s.cta.openInMaps}
              <Icon name="external" size={14} />
              <span className="visually-hidden"> {s.opensNewTab}</span>
            </a>
          )}
        </div>
      </li>

      {config.contact.phones.map((p, i) => {
        const href = telHref(p.number);
        return (
          <li key={i}>
            <Icon name="phone" />
            <div>
              <span className="contact-list__label">{t(p.label) || s.contact.phone}</span>
              {href ? <a href={href}>{p.number}</a> : <span>{p.number}</span>}
            </div>
          </li>
        );
      })}

      <li>
        <Icon name="mail" />
        <div>
          <span className="contact-list__label">{s.contact.email}</span>
          {email ? <a href={`mailto:${email}`}>{email}</a> : <span>{config.contact.email || s.contact.toBeAdded}</span>}
        </div>
      </li>

      {wa && (
        <li>
          <Icon name="whatsapp" />
          <div>
            <span className="contact-list__label">{s.contact.whatsapp}</span>
            <a href={wa} target="_blank" rel="noopener noreferrer">
              {s.cta.chatOnWhatsApp}
              <span className="visually-hidden"> {s.opensNewTab}</span>
            </a>
          </div>
        </li>
      )}

      {showHours && config.contact.officeHours.length > 0 && (
        <li>
          <Icon name="clock" />
          <div>
            <span className="contact-list__label">{s.contact.officeHours}</span>
            <dl className="hours">
              {config.contact.officeHours.map((h, i) => (
                <div key={i}>
                  <dt>{t(h.days)}</dt>
                  <dd>{t(h.hours)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </li>
      )}
    </ul>
  );
}

const SOCIAL_NAMES = { facebook: 'Facebook', youtube: 'YouTube', instagram: 'Instagram', x: 'X' } as const;

export function SocialLinks() {
  const config = useSite();
  const { s } = useLanguage();
  const items = (Object.keys(SOCIAL_NAMES) as (keyof typeof SOCIAL_NAMES)[])
    .map((key) => [key, config.social[key]] as const)
    .filter(([, url]) => isSet(url) && /^https:\/\//.test(url!));
  if (items.length === 0) return null;
  return (
    <div className="social">
      <p className="social__label">{s.contact.followUs}</p>
      <ul>
        {items.map(([key, url]) => (
          <li key={key}>
            <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${SOCIAL_NAMES[key]} ${s.opensNewTab}`}>
              <Icon name={key} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
