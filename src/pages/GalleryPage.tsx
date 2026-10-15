import { Gallery } from '../components/Gallery';
import { PageHeader } from '../components/PageHeader';
import { Section } from '../components/Section';
import { useSite } from '../lib/site';
import { useLanguage } from '../i18n/LanguageContext';
import { usePageMeta } from '../lib/seo';

export default function GalleryPage() {
  const config = useSite();
  usePageMeta('gallery');
  const { s, t } = useLanguage();

  return (
    <>
      <PageHeader title={s.nav.gallery} intro={s.pageIntro.gallery} />
      <Section>
        <p className="lead">{t(config.gallery.intro)}</p>
        <Gallery />
      </Section>
    </>
  );
}
