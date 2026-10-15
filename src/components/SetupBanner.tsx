import { useSite } from '../lib/site';
import { useLanguage } from '../i18n/LanguageContext';
import { findPlaceholders } from '../lib/content';
import { contentStatus } from '../lib/offline';

/** Development-only reminder that placeholder content is still in the config. */
export function SetupBanner() {
  const config = useSite();
  const { s } = useLanguage();
  if (!import.meta.env.DEV) return null;
  if (contentStatus.usingStarterContent) {
    return (
      <div className="setup-banner" role="note">
        {s.offlineBanner}
      </div>
    );
  }
  const count = findPlaceholders(config).length;
  if (count === 0) return null;
  return (
    <div className="setup-banner" role="note">
      {s.setupBanner.replace('{n}', String(count))}
    </div>
  );
}
