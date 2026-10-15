import { useSite } from '../lib/site';
import { useLanguage } from '../i18n/LanguageContext';
import { whatsappHref } from '../lib/contact';
import { Icon } from './Icon';

/** Floating WhatsApp button. Hidden until a real WhatsApp number is configured. */
export function WhatsAppButton() {
  const config = useSite();
  const { s, t } = useLanguage();
  const href = whatsappHref(config, t(config.contact.whatsappGreeting));
  if (!href) return null;
  return (
    <a className="whatsapp-fab" href={href} target="_blank" rel="noopener noreferrer">
      <Icon name="whatsapp" size={28} />
      <span className="visually-hidden">
        {s.cta.chatOnWhatsApp} {s.opensNewTab}
      </span>
    </a>
  );
}
