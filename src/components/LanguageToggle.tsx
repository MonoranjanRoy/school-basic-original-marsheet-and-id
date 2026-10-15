import { useSite } from '../lib/site';
import { useLanguage } from '../i18n/LanguageContext';
import { strings } from '../i18n/strings';
import { Icon } from './Icon';

export function LanguageToggle({ className = '' }: { className?: string }) {
  const config = useSite();
  const { lang, setLang, s } = useLanguage();
  if (!config.enableBengali) return null;
  const next = lang === 'en' ? 'bn' : 'en';
  const nextName = strings[next].languageName;
  return (
    <button
      type="button"
      className={`lang-toggle ${className}`}
      onClick={() => setLang(next)}
      aria-label={`${s.switchLanguage} ${nextName}`}
    >
      <Icon name="globe" size={18} />
      <span lang={next}>{nextName}</span>
    </button>
  );
}
